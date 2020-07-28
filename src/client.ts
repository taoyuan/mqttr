import {EventEmitter} from 'events';
import {AsyncMqttClient, IClientSubscribeOptions} from 'async-mqtt';
import {IClientPublishOptions, ISubscriptionGrant} from 'mqtt';
import {Packet} from 'mqtt-packet';
import {Codec} from './types';
import {Matched, Router} from './router';
import {Subscription} from './subscription';
import {AsyncOrSync} from './types';
import {JsonCodec} from './codecs/json';

const debug = require('debug')('mqttr:client');

export interface ClientOptions {
  codec?: Codec;
  log: any;
}

export interface Message {
  topic: string;
  payload: any;
  params: Record<string, any>;
  splats: string[];
  path: string;
  packet: any;
}

export type StandardSubHandler = (message: Message) => AsyncOrSync<any>;
export type ExpandedSubHandler = (
  topic: string,
  payload: any,
  message?: Message,
) => AsyncOrSync<any>;
export type SubHandler = StandardSubHandler | ExpandedSubHandler;

export type OnConnectCallback = (packet: Packet) => void;
export type OnMessageCallback = (
  topic: string,
  payload: Buffer,
  packet: Packet,
) => void;
export type OnErrorCallback = (error: Error) => void;
export type OnReconnect = () => void;
export type OnOffline = () => void;
export type OnClose = () => void;

export class Client extends EventEmitter {
  public _client: AsyncMqttClient;
  public codec: Codec;
  public router: Router;

  constructor(client: AsyncMqttClient, options?: ClientOptions) {
    super();

    options = options ?? <ClientOptions>{};

    this._client = client;
    this.codec = options.codec ?? new JsonCodec();

    debug('Using codec:', this.codec.name);

    this.router = new Router();

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    client.on('connect', async packet => {
      debug('connected');
      await this._connected();
      this.emit('connect', packet);
    });

    client.on('reconnect', () => {
      debug('reconnect');
      this.emit('reconnect');
    });

    client.on('close', () => {
      debug('close');
      this.emit('close');
    });

    client.on('offline', () => {
      debug('offline');
      this.emit('offline');
    });

    client.on('error', error => {
      this.emit('error', error);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    client.on('message', async (topic, payload, packet) => {
      // Try decode
      try {
        payload = this.codec.decode(payload);
      } catch (e) {
        // Using origin payload if failed
        // no-op
      }
      try {
        await this._handleMessage(topic, payload, packet);
      } catch (e) {
        this.emit('error', e);
      }
    });
  }

  get connected() {
    return this._client.connected;
  }

  get disconnecting() {
    return this._client.disconnecting;
  }

  get disconnected() {
    return this._client.disconnected;
  }

  get reconnecting() {
    return this._client.reconnecting;
  }

  public on(event: 'connect', cb: OnConnectCallback): this;
  public on(event: 'reconnect', cb: OnReconnect): this;
  public on(event: 'offline', cb: OnOffline): this;
  public on(event: 'close', cb: OnClose): this;
  public on(event: 'message', cb: OnMessageCallback): this;
  public on(event: 'error', cb: OnErrorCallback): this;
  public on(event: string, cb: (...args: any[]) => void): this {
    return super.on(event, cb);
  }

  public once(event: 'connect', cb: OnConnectCallback): this;
  public once(event: 'reconnect', cb: OnReconnect): this;
  public once(event: 'offline', cb: OnOffline): this;
  public once(event: 'close', cb: OnClose): this;
  public once(event: 'message', cb: OnMessageCallback): this;
  public once(event: 'error', cb: OnErrorCallback): this;
  public once(event: string, cb: (...args: any[]) => void): this {
    return super.once(event, cb);
  }

  async _connected() {
    await Promise.all(
      this.router.routes.map(route => this._subscribe(route.path)),
    );
  }

  protected _subscribe(
    topic: string | string[],
    options?: IClientSubscribeOptions,
  ): Promise<ISubscriptionGrant[]> {
    return this._client.subscribe(compileTopic(topic as any), options as any);
  }

  protected async _handleMessage(topic: string, payload: any, packet: any) {
    let matched: Matched | undefined = this.router.match(topic);

    if (!matched) {
      debug('No handler to handle message with topic [%s]', topic);
      return;
    }

    const matches: Matched[] = [];
    while (matched) {
      matches.push(matched);
      matched = matched.next();
    }

    for (const match of matches) {
      const sub = <Subscription>match.data;
      if (sub && !sub.cancelled) {
        const message = {
          topic,
          payload,
          params: match.params,
          path: match.route,
          packet,
        };

        if (sub.handler.length === 1) {
          await sub.handler(message);
        } else {
          await sub.handler(topic, payload, message);
        }
      }
    }
  }

  async ready(): Promise<this> {
    if (this.connected) {
      return this;
    }

    return new Promise(resolve => {
      this.once('connect', () => resolve(this));
    });
  }

  async subscribe(
    topic: string,
    handler: SubHandler,
    options?: IClientSubscribeOptions,
  ): Promise<Subscription> {
    const sub = new Subscription(this, topic, handler);
    if (this.connected) {
      await this._subscribe(topic, options);
    }
    return sub;
  }

  unsubscribe(topic: string | string[]) {
    return this._client.unsubscribe(compileTopic(topic as any));
  }

  publish(topic: string, message: any, options?: IClientPublishOptions) {
    return this._client.publish(topic, this.codec.encode(message), options!);
  }

  end(force?: boolean) {
    return this._client.end(force);
  }
}

function compileTopic(topic: string): string;
function compileTopic(topic: string[]): string[];
function compileTopic(topic: string | string[]): string | string[] {
  if (Array.isArray(topic)) {
    return topic.map(t => compileTopic(t));
  }
  return topic
    .replace(/:[a-zA-Z0-9]+\*$/g, '#')
    .replace(/:[a-zA-Z0-9]+/g, '+')
    .replace(/\(\.\*\)$/g, '#');
}

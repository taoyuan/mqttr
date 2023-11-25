import {EventEmitter} from 'events';
import {MqttClient, IClientSubscribeOptions} from 'mqtt';
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

export type StandardMessageHandler = (message: Message) => AsyncOrSync<void>;
export type ExpandedMessageHandler = (topic: string, payload: any, message: Message) => AsyncOrSync<void>;
export type MessageHandler = StandardMessageHandler | ExpandedMessageHandler;

export type OnConnectCallback = (packet: Packet) => void;
export type OnMessageCallback = (topic: string, payload: Buffer, packet: Packet) => void;
export type OnErrorCallback = (error: Error) => void;
export type OnReconnect = () => void;
export type OnOffline = () => void;
export type OnClose = () => void;

export class Client extends EventEmitter {
  protected codec: Codec;
  client: MqttClient;
  router: Router;

  constructor(client: MqttClient, options?: ClientOptions) {
    super();

    options = options ?? <ClientOptions>{};

    this.client = client;
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
    return this.client.connected;
  }

  get disconnecting() {
    return this.client.disconnecting;
  }

  get disconnected() {
    return this.client.disconnected;
  }

  get reconnecting() {
    return this.client.reconnecting;
  }

  on(event: 'connect', cb: OnConnectCallback): this;
  on(event: 'reconnect', cb: OnReconnect): this;
  on(event: 'offline', cb: OnOffline): this;
  on(event: 'close', cb: OnClose): this;
  on(event: 'message', cb: OnMessageCallback): this;
  on(event: 'error', cb: OnErrorCallback): this;
  on(event: string, cb: (...args: any[]) => void): this {
    return super.on(event, cb);
  }

  once(event: 'connect', cb: OnConnectCallback): this;
  once(event: 'reconnect', cb: OnReconnect): this;
  once(event: 'offline', cb: OnOffline): this;
  once(event: 'close', cb: OnClose): this;
  once(event: 'message', cb: OnMessageCallback): this;
  once(event: 'error', cb: OnErrorCallback): this;
  once(event: string, cb: (...args: any[]) => void): this {
    return super.once(event, cb);
  }

  protected async _connected() {
    await Promise.all(this.router.routes.map(route => this._subscribe(route.path)));
  }

  protected _subscribe(topic: string | string[], options?: IClientSubscribeOptions): Promise<ISubscriptionGrant[]> {
    return this.client.subscribeAsync(compileTopic(topic as any), options as any);
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

  async subscribe(topic: string, handler: MessageHandler, options?: IClientSubscribeOptions): Promise<Subscription> {
    const sub = new Subscription(this, topic, handler);
    if (this.connected) {
      await this._subscribe(topic, options);
    }
    return sub;
  }

  unsubscribe(topic: string | string[]) {
    return this.client.unsubscribeAsync(compileTopic(topic as any));
  }

  publish(topic: string, message: any, options?: IClientPublishOptions) {
    return this.client.publishAsync(topic, this.codec.encode(message), options!);
  }

  end(force?: boolean) {
    return this.client.endAsync(force);
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

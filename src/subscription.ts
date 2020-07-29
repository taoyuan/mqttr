import {Client} from './client';

export class Subscription {
  protected _client: Client;
  protected _topic: string;
  protected _cancelled: boolean;
  protected _handler: Function;

  constructor(client: Client, topic: string, handler: Function) {
    this._client = client;
    this._cancelled = false;
    this._topic = topic;
    this._handler = handler;
    this._client.router.add(topic, this);
  }

  get topic() {
    return this._topic;
  }

  get handler() {
    return this._handler;
  }

  get cancelled() {
    return this._cancelled;
  }

  async cancel(): Promise<void> {
    if (this._cancelled) {
      return;
    }
    this._cancelled = true;
    this._client.router.remove(this._topic, this);
    await this._client.unsubscribe(this._topic);
  }
}

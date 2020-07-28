import {Client} from './client';

export class Subscription {
  public client: Client;
  public cancelled: boolean;
  public topic: string;
  public handler: Function;

  constructor(client: Client, topic: string, handler: Function) {
    this.client = client;
    this.cancelled = false;
    this.topic = topic;
    this.handler = handler;

    this.client.router.add(topic, this);
  }

  async cancel(): Promise<void> {
    if (this.cancelled) {
      return;
    }
    this.cancelled = true;
    this.client.router.remove(this.topic, this);
    await this.client.unsubscribe(this.topic);
  }
}

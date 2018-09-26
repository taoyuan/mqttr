import {Client, SubscribeHandler} from "./client";

export class Subscription {
	public client: Client;
	public cancelled: boolean;
	public topic: string;
	public handler: SubscribeHandler;

	constructor(client: Client, topic: string, handler: SubscribeHandler) {
		this.client = client;
		this.cancelled = false;
		this.topic = topic;
		this.handler = handler;

		this.client.router.add(topic, this);
	}

	cancel(cb) {
		if (this.cancelled) return;
		this.cancelled = true;
		this.client.router.remove(this.topic, this);
		this.client._unsubscribe(this.topic, cb);
	}
}

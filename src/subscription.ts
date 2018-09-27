import {Client} from "./client";
import {createPromiseCallback, PromiseCallback} from "./utils";

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

	cancel(cb?: (() => void) | PromiseCallback): Promise<any> | undefined {
		cb = cb || createPromiseCallback();
		if (this.cancelled) {
			// @ts-ignore
			return cb();
		}
		this.cancelled = true;
		this.client.router.remove(this.topic, this);
		this.client._unsubscribe(this.topic, cb);
		// @ts-ignore
		return cb.promise;
	}
}

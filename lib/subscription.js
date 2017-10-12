class Subscription {

	constructor(client, topic, handler) {
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

module.exports = Subscription;

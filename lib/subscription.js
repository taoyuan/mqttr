"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class Subscription {
    constructor(client, topic, handler) {
        this.client = client;
        this.cancelled = false;
        this.topic = topic;
        this.handler = handler;
        this.client.router.add(topic, this);
    }
    cancel(cb) {
        cb = cb || utils_1.createPromiseCallback();
        if (this.cancelled) {
            return cb();
        }
        this.cancelled = true;
        this.client.router.remove(this.topic, this);
        this.client._unsubscribe(this.topic, cb);
        return cb.promise;
    }
}
exports.Subscription = Subscription;
//# sourceMappingURL=subscription.js.map
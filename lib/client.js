"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const PromiseA = require("bluebird");
const codec_1 = require("./codec");
const events_1 = require("events");
const router_1 = require("./router");
const subscription_1 = require("./subscription");
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
function createLogger(category) {
    const debug = require('debug')(category);
    const logger = {};
    levels.forEach(level => {
        logger[level] = function (...args) {
            debug('[' + level + '] ', ...args);
        };
    });
    return logger;
}
class Client extends events_1.EventEmitter {
    constructor(mqttclient, options, log) {
        super();
        options = options || {};
        this.mqttclient = mqttclient;
        this.codec = options.codec || codec_1.msgpack();
        this.log = log = log || options.log || createLogger('mqttr');
        log.debug('Using codec:', this.codec.name);
        this.router = new router_1.Router();
        const that = this;
        mqttclient.on('connect', (connack) => {
            log.debug('connected');
            that._connected();
            that.emit('connect', connack);
        });
        mqttclient.on('reconnect', () => {
            log.debug('reconnect');
            that.emit('reconnect');
        });
        mqttclient.on('close', () => {
            log.debug('close');
            that.emit('close');
        });
        mqttclient.on('offline', () => {
            log.debug('offline');
            that.emit('offline');
        });
        mqttclient.on('error', (error) => {
            that.emit('error', error);
        });
        mqttclient.on('message', (topic, payload, packet) => {
            try {
                payload = that.codec.decode(payload);
            }
            catch (e) {
            }
            that._handleMessage(topic, payload, packet);
        });
    }
    get connected() {
        return this.mqttclient.connected;
    }
    get disconnecting() {
        return this.mqttclient.disconnecting;
    }
    get disconnected() {
        return this.mqttclient.disconnected;
    }
    get reconnecting() {
        return this.mqttclient.reconnecting;
    }
    _connected() {
        return __awaiter(this, void 0, void 0, function* () {
            for (const route of this.router.routes) {
                yield PromiseA.fromCallback(cb => this._subscribe(route.path, cb));
            }
        });
    }
    _subscribe(topic, options, cb) {
        if (typeof options === 'function') {
            cb = options;
            options = undefined;
        }
        options ? this.mqttclient.subscribe(mqttTopic(topic), options, cb) : this.mqttclient.subscribe(mqttTopic(topic), cb);
    }
    _unsubscribe(topic, cb) {
        this.mqttclient.unsubscribe(mqttTopic(topic), cb);
    }
    _handleMessage(topic, payload, packet) {
        let matched = this.router.match(topic);
        if (!matched) {
            return this.log.debug('No handler to handle message with topic [%s]', topic);
        }
        const matches = [];
        while (matched) {
            matches.push(matched);
            matched = matched.next && matched.next();
        }
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const sub = match.data;
            if (sub && !sub.cancelled) {
                const message = {
                    topic,
                    payload,
                    params: match.params,
                    splats: match.splats,
                    path: match.route,
                    packet
                };
                if (sub.handler.length === 1) {
                    sub.handler(message);
                }
                else {
                    sub.handler(topic, payload, message);
                }
            }
        }
    }
    ready(cb) {
        if (!cb) {
            return this;
        }
        if (this.connected) {
            cb();
        }
        else {
            this.once('connect', () => {
                cb();
            });
        }
    }
    subscribe(topic, handler, options, cb) {
        const sub = new subscription_1.Subscription(this, topic, handler);
        if (this.connected) {
            this._subscribe(topic, options, cb);
        }
        return sub;
    }
    publish(topic, message, options, cb) {
        this.mqttclient.publish(mqttTopic(topic), this.codec.encode(message), options, cb);
    }
    end(force, cb) {
        this.mqttclient.end(force, cb);
    }
}
exports.Client = Client;
function mqttTopic(topic) {
    return topic.replace(/:[a-zA-Z0-9]+/g, '+')
        .replace(/\*\*/g, '#')
        .replace(/\*/g, '+');
}
//# sourceMappingURL=client.js.map
const _ = require('lodash');
const async = require('async');
const EventEmitter = require('events').EventEmitter;
const codec = require('./codec');
const Router = require('./router');
const Subscription = require('./subscription');

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function createLogger(category) {
	const debug = require('debug')(category);
	const logger = {};
	levels.forEach(level => {
		logger[level] = function () {
			debug(...['[' + level + '] '].concat(arguments));
		};
	});
	return logger;
}

class Client extends EventEmitter{
	constructor(mqttclient, options, log) {
		super();

		options = options || {};

		this.mqttclient = mqttclient;
		this.codec = options.codec || codec.msgpack();
		this.log = log = log || options.log || createLogger('mqttr');

		log.debug('Using codec:', this.codec.name);

		this.router = new Router();

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
			// Try decode
			try {
				payload = that.codec.decode(payload);
			} catch (e) { // Using origin payload if failed
				// no-op
			}
			that._handleMessage(topic, payload, packet);
		});
	}

	get connected() {
		return this.mqttclient.connected;
	}

	_connected() {
		async.eachSeries(this.router.routes, (r, cb) => this._subscribe(r.path, cb));
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
			matched = matched.next();
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
				} else {
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
		} else {
			this.once('connect', () => { // ignore connack
				cb();
			});
		}
	}

	subscribe(topic, handler, options, cb) {
		const sub = new Subscription(this, topic, handler);
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

module.exports = Client;

function mqttTopic(topic) {
	return topic.replace(/:[a-zA-Z0-9]+/g, '+')
		.replace(/\*\*/g, '#')
		.replace(/\*/g, '+');
}

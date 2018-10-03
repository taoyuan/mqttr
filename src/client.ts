import PromiseA = require('bluebird');
import {ClientSubscribeCallback, IClientSubscribeOptions, MqttClient} from "mqtt";
import {Codec, msgpack} from "./codec";
import {EventEmitter} from 'events';
import {Matched, Router} from './router';
import {Subscription} from './subscription';

export interface LogFn {
	(...args): void;
}

export interface Logger {
	trace: LogFn;
	debug: LogFn;
	info: LogFn;
	warn: LogFn;
	error: LogFn;
	fatal: LogFn;
}

export interface ClientOptions {
	codec?: Codec;
	log: any;
}

export interface Message {
	topic: string;
	payload: any;
	params: {[name: string]: string};
	splats: string[];
	path: string;
	packet: any;
}

export interface StandardSubHandler {
	(message: Message): void;
}

export interface ExpandedSubHandler {
	(topic: string, payload: any, message?: Message): void;
}

export type SubHandler = StandardSubHandler | ExpandedSubHandler;

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function createLogger(category): Logger {
	const debug = require('debug')(category);
	const logger = {};
	levels.forEach(level => {
		logger[level] = function (...args) {
			debug('[' + level + '] ', ...args);
		};
	});
	return <Logger>logger;
}

export class Client extends EventEmitter {
	public mqttclient: MqttClient;
	public codec: Codec;
	public log: Logger;
	public router: Router;

	constructor(mqttclient: MqttClient, options?: ClientOptions, log?) {
		super();

		options = options || <ClientOptions>{};

		this.mqttclient = mqttclient;
		this.codec = options.codec || msgpack();
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

	get disconnecting() {
		return this.mqttclient.disconnecting
	}

	get disconnected() {
		return this.mqttclient.disconnected;
	}

	get reconnecting() {
		return this.mqttclient.reconnecting;
	}

	async _connected() {
		for (const route of this.router.routes) {
			await PromiseA.fromCallback(cb => this._subscribe(route.path, cb));
		}

		// async.eachSeries(this.router.routes, (r, cb) => this._subscribe(r.path, cb));
	}

	_subscribe(topic: string, options?: IClientSubscribeOptions | ClientSubscribeCallback, cb?: ClientSubscribeCallback) {
		if (typeof options === 'function') {
			cb = options;
			options = undefined;
		}
		options ? this.mqttclient.subscribe(mqttTopic(topic), options, cb) : this.mqttclient.subscribe(mqttTopic(topic), cb);
	}

	_unsubscribe(topic, cb) {
		this.mqttclient.unsubscribe(mqttTopic(topic), cb);
	}

	_handleMessage(topic: string, payload: any, packet: any) {
		let matched: Matched | undefined = this.router.match(topic);

		if (!matched) {
			return this.log.debug('No handler to handle message with topic [%s]', topic);
		}

		const matches: Matched[] = [];
		while (matched) {
			matches.push(matched);
			matched = matched.next &&  matched.next();
		}

		for (let i = 0; i < matches.length; i++) {
			const match = matches[i];
			const sub = <Subscription> match.data;
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

	subscribe(topic: string, handler: SubHandler, cb?: ClientSubscribeCallback): Subscription;
	subscribe(topic: string, handler: SubHandler, options: IClientSubscribeOptions, cb?: ClientSubscribeCallback): Subscription;
	subscribe(topic: string, handler: SubHandler, options?: IClientSubscribeOptions | ClientSubscribeCallback, cb?: ClientSubscribeCallback): Subscription {
		const sub = new Subscription(this, topic, handler);
		if (this.connected) {
			this._subscribe(topic, options, cb);
		}
		return sub;
	}

	publish(topic, message, options?, cb?) {
		this.mqttclient.publish(mqttTopic(topic), this.codec.encode(message), options, cb);
	}

	end(force?, cb?) {
		this.mqttclient.end(force, cb);
	}
}

function mqttTopic(topic: string): string {
	return topic.replace(/:[a-zA-Z0-9]+/g, '+')
		.replace(/\*\*/g, '#')
		.replace(/\*/g, '+');
}

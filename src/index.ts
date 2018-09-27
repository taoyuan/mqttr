import * as mqtt from "mqtt";
import {IClientOptions} from "mqtt";
import {Client, ClientOptions} from "./client";
import {Codec} from "./codec";

export const codec = require('./codec');
export * from "./router";
export * from "./client";
export * from "./subscription";

export interface ConnectOptions extends IClientOptions {
	codec?: string | Codec;
}

export function connect(opts?: ConnectOptions): Client;
export function connect(url?: string, opts?: ConnectOptions): Client;
export function connect (url?: string | ConnectOptions, opts?: ConnectOptions): Client {
	if (typeof url === 'object') {
		opts = url;
		url = undefined;
	}
	opts = Object.assign({qos: 1}, opts);
	opts.codec = opts.codec || 'json';

	if (typeof opts.codec === 'string') {
		if (!exports.codec[opts.codec]) throw new Error('Unknown codec: ' + opts.codec);
		opts.codec = exports.codec[opts.codec](opts);
	}
	return new Client(mqtt.connect(url, opts), <ClientOptions> opts);
}

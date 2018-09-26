export interface Codec {
	name: string;
	encode: (data: string | Buffer) => any;
	decode: (data: string | Buffer) => any;
}

export function raw(): Codec {
	return {
		name: 'raw',
		encode(data) {
			return data;
		},
		decode(data) {
			return data;
		}
	};
}

export function json(options?: {[name: string]: any}): Codec {
	options = options || {};
	return {
		name: 'json',
		encode(data) {
			return JSON.stringify(data, options && options.replacer);
		},
		decode(data) {
			if (Buffer.isBuffer(data)) {
				data = data.toString();
			}
			return JSON.parse(data, options && options.reviver);
		}
	};
}

export function msgpack(options?: {[name: string]: any}): Codec {
	const msgpack = require('msgpack5')();

	options = options || {};

	let coders = options.coders || options.coder;

	if (coders && !Array.isArray(coders)) {
		coders = [coders];
	}

	if (coders) {
		coders.forEach((coder) => msgpack.register(coder.code, coder.type, coder.encode, coder.decode));
	}

	return {
		name: 'msgpack',
		encode(data) {
			return msgpack.encode(data);
		},
		decode(data) {
			return msgpack.decode(data);
		}
	};
}

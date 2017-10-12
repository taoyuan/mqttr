exports.raw = function () {
	return {
		name: 'raw',
		encode(data) {
			return data;
		},
		decode(data) {
			return data;
		}
	};
};

exports.json = function (options) {
	return {
		name: 'json',
		encode(data) {
			return JSON.stringify(data, options);
		},
		decode(data) {
			return JSON.parse(data);
		}
	};
};

exports.msgpack = function (options) {
	const msgpack = require('msgpack5')();

	options = options || {};

	let coders = options.coders || options.coder;

	if (coders && !Array.isArray(coders)) {
		coders = [coders];
	}

	if (coders) {
		coders.forEach((coder) => {
			msgpack.register(coder.code, coder.type, coder.encode, coder.decode);
		});
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
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function raw() {
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
exports.raw = raw;
function json(options) {
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
exports.json = json;
function msgpack(options) {
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
exports.msgpack = msgpack;
//# sourceMappingURL=codec.js.map
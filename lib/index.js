"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt = require("mqtt");
const client_1 = require("./client");
exports.codec = require('./codec');
__export(require("./router"));
__export(require("./client"));
__export(require("./subscription"));
function connect(url, opts) {
    if (typeof url === 'object') {
        opts = url;
        url = undefined;
    }
    opts = Object.assign({ qos: 1 }, opts);
    opts.codec = opts.codec || 'json';
    if (typeof opts.codec === 'string') {
        if (!exports.codec[opts.codec])
            throw new Error('Unknown codec: ' + opts.codec);
        opts.codec = exports.codec[opts.codec](opts);
    }
    return new client_1.Client(mqtt.connect(url, opts), opts);
}
exports.connect = connect;
//# sourceMappingURL=index.js.map
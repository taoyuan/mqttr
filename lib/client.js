"use strict";

const _ = require('lodash');
const async = require('async');
const util = require('util');
const EventEmitter = require('events').EventEmitter;
const codec = require('./codec');
const Router = require('./router');
const Subscription = require('./subscription');

module.exports = Client;

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];

function createLogger(category) {
  const debug = require('debug')(category);
  return _.reduce(levels, function (logger, level) {
    logger[level] = function () {
      debug.apply(undefined, _(['[' + level + '] ']).concat(arguments));
    };
    return logger;
  }, {});
}

/**
 *
 * @constructor
 */
function Client(mqttclient, options, log) {
  if (!(this instanceof Client)) {
    return new Client(mqttclient, options, log);
  }

  options = options || {};

  this.mqttclient = mqttclient;
  this.codec = options.codec || codec.msgpack();
  this.log = log = log || options.log || createLogger('mqttr');

  log.debug('Using codec:', this.codec.name);

  this.router = new Router();

  const that = this;
  mqttclient.on('connect', function (connack) {
    log.debug('connected');
    that._connected();
    that.emit('connect', connack);
  });

  mqttclient.on('reconnect', function () {
    log.debug('reconnect');
    that.emit('reconnect');
  });

  mqttclient.on('close', function () {
    log.debug('close');
    that.emit('close');
  });

  mqttclient.on('offline', function () {
    log.debug('offline');
    that.emit('offline');
  });

  mqttclient.on('error', function (error) {
    that.emit('error', error);
  });

  mqttclient.on('message', function (topic, payload, packet) {
    // try decode
    try {
      payload = that.codec.decode(payload);
    } catch (e) { // using origin payload if failed
      // no-op
    }
    that._handleMessage(topic, payload, packet);
  });
}

util.inherits(Client, EventEmitter);

Object.defineProperty(Client.prototype, 'connected', {
  get: function () {
    return this.mqttclient.connected;
  }
});

Client.prototype._connected = function () {
  const that = this;
  async.eachSeries(this.router.routes, function (r, cb) {
    that._subscribe(r.path, cb);
  });
};

Client.prototype._subscribe = function (topic, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = undefined;
  }
  return options ? this.mqttclient.subscribe(mqttTopic(topic), options, cb) : this.mqttclient.subscribe(mqttTopic(topic), cb);
};

Client.prototype._unsubscribe = function (topic, cb) {
  this.mqttclient.unsubscribe(mqttTopic(topic), cb);
};

Client.prototype._handleMessage = function (topic, payload, packet) {
  let sub, message;
  let matched = this.router.match(topic);

  if (!matched) {
    return this.log.debug('No handler to handle message with topic [%s]', topic);
  }

  while (matched) {
    sub = matched.data;

    if (sub && !sub.cancelled) {
      message = {
        topic: topic,
        payload: payload,
        params: matched.params,
        splats: matched.splats,
        path: matched.route,
        packet: packet
      };

      if (sub.handler.length === 1) {
        sub.handler.call(sub, message);
      } else {
        sub.handler.call(sub, topic, payload, message);
      }
    }

    matched = matched.next();
  }
};

Client.prototype.ready = function (cb) {
  if (!cb) {
    return;
  }

  if (this.connected) {
    cb();
  } else {
    this.once('connect', function () { // ignore connack
      cb();
    });
  }
};

Client.prototype.subscribe = function (topic, handler, options, cb) {
  const sub = new Subscription(this, topic, handler);
  if (this.connected) {
    this._subscribe(topic, options, cb);
  }
  return sub;
};

Client.prototype.publish = function (topic, message, options, cb) {
  this.mqttclient.publish(mqttTopic(topic), this.codec.encode(message), options, cb);
};

Client.prototype.end = function (force, cb) {
  this.mqttclient.end(force, cb);
};

function mqttTopic(topic) {
  return topic.replace(/:[a-zA-Z0-9]+/g, "+")
    .replace(/\*\*/g, "#")
    .replace(/\*/g, "+");
}


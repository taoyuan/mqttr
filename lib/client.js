"use strict";

var debug = require('debug')('mqttr');
var async = require('async');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Router = require('./router');
var Subscription = require('./subscription');

module.exports = Client;

/**
 *
 * @constructor
 */
function Client(mqttclient) {
  if (!(this instanceof Client)) {
    return new Client(mqttclient);
  }

  this.mqttclient = mqttclient;

  this.router = new Router();

  var that = this;
  mqttclient.on('connect', function (connack) {
    debug('connected');
    that._connected();
    that.emit('connect', connack);
  });

  mqttclient.on('reconnect', function () {
    debug('reconnect');
    that.emit('reconnect');
  });

  mqttclient.on('close', function () {
    debug('close');
    that.emit('close');
  });

  mqttclient.on('offline', function () {
    debug('offline');
    that.emit('offline');
  });

  mqttclient.on('error', function (error) {
    that.emit('error', error);
  });

  mqttclient.on('message', function (topic, message, packet) {
    that._handleMessage(topic, JSON.parse(message), packet);
  });
}

util.inherits(Client, EventEmitter);

Object.defineProperty(Client.prototype, 'connected', {
  get: function () {
    return this.mqttclient.connected;
  }
});

Client.prototype._connected = function () {
  var that = this;
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
  var sub, message;
  var matched = this.router.match(topic);

  if (!matched) {
    return debug('No handler to handle message with topic [%s]', topic);
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
        sub.handler(message);
      } else {
        sub.handler(topic, payload, message);
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
  var sub = new Subscription(this, topic, handler);
  if (this.connected) {
    this._subscribe(topic, options, cb);
  }
  return sub;
};

Client.prototype.publish = function (topic, message, options, cb) {
  this.mqttclient.publish(mqttTopic(topic), JSON.stringify(message), options, cb);
};

Client.prototype.end = function (force, cb) {
  this.mqttclient.end(force, cb);
};

function mqttTopic(topic) {
  return topic.replace(/:[a-zA-Z0-9]+/g, "+")
    .replace(/\*\*/g, "#")
    .replace(/\*/g, "+");
}


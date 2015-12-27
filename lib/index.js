'use strict';

var mqtt = require('mqtt');
var Client = require('./client');

exports.connect = function (url, options) {
  return new Client(mqtt.connect(url, options));
};

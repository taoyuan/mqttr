'use strict';

var _ = require('lodash');
var mqtt = require('mqtt');
var Client = require('./client');

exports.connect = function (url, options) {
  if (typeof url === 'object') {
    options = url;
    url = undefined;
  }
  options = _.assign({ qos: 1 }, options);
  return new Client(mqtt.connect(url, options));
};

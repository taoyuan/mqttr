'use strict';

var _ = require('lodash');
var mqtt = require('mqtt');

exports.Client = require('./client');
exports.Router = require('./router');

exports.connect = function (url, options) {
  if (typeof url === 'object') {
    options = url;
    url = undefined;
  }
  options = _.assign({ qos: 1 }, options);
  return new exports.Client(mqtt.connect(url, options));
};



"use strict";

exports.json = function () {
  return {
    name: 'json',
    encode: function (data) {
      return JSON.stringify(data);
    },
    decode: function (data) {
      return JSON.parse(data);
    }
  };
};

exports.msgpack = function () {
  var msgpack = require('msgpack5')();

  return {
    name: 'msgpack',
    encode: function (data) {
      return msgpack.encode(data);
    },
    decode: function (data) {
      return msgpack.decode(data);
    }
  };
};

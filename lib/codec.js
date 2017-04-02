"use strict";

exports.raw = function (options) {
  return {
    name: 'raw',
    encode: function (data) {
      return data;
    },
    decode: function (data) {
      return data;
    }
  };
};

exports.json = function (options) {
  return {
    name: 'json',
    encode: function (data) {
      return JSON.stringify(data, options);
    },
    decode: function (data) {
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
    coders.forEach(function (coder) {
      msgpack.register(coder.code, coder.type, coder.encode, coder.decode);
    });
  }

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

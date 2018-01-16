"use strict";

var net = require('net');
var mosca = require('mosca');

var portrange = 45032;

function getPort(cb) {
  var port = portrange;
  portrange += 1;

  var server = net.createServer();

  server.listen(port, function (err) {
    if (err) throw err;
    server.once('close', function () {
      cb(port);
    });
    server.close();
  });

  server.on('error', function (err) {
    if (err) throw err;
    getPort(cb);
  });
}

exports.createMQTTServer = function (settings, cb) {
  if (typeof settings === 'function') {
    cb = settings;
    settings = undefined;
  }
  settings = settings || {};

  if ('port' in settings) {
    cb(null, createServer(settings));
  } else {
    getPort(function (port) {
      settings.port = port;
      cb(null, createServer(settings));
    });
  }

  function createServer(options) {
    var server = new mosca.Server(options);
    server.url = 'mqtt://127.0.0.1:' + options.port;
    server.port = options.port;
    return server;
  }

};

"use strict";

var net = require('net');
var mosca = require('mosca');

var portrange = 45032;

function getPort(cb) {
  var port = portrange;
  portrange += 1;

  var server = net.createServer();
  server.listen(port, function (err) {
    server.once('close', function () {
      cb(port);
    });
    server.close();
  });
  server.on('error', function (err) {
    getPort(cb);
  })
}

exports.createMqttServer = function (settings, cb) {
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

  function createServer(settings) {
    var server = new mosca.Server(settings);
    server.url = 'mqtt://127.0.0.1:' + settings.port;
    server.port = settings.port;
    return server;
  }

};

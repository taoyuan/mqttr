#!/usr/bin/env node
"use strict";

var mqttr = require('../');
var path = require('path');
var fs = require('fs');
var concat = require('concat-stream');
var minimist = require('minimist');

var helpMe = require('help-me')({
  dir: path.join(__dirname, '..', 'doc')
});

function send(args) {
  var client = mqttr.connect(args);
  client.on('connect', function () {
    var message = args.message;
    try {
      message = JSON.parse(message);
    } catch (e) {
      // no-op
    }
    client.publish(args.topic, message, args);
    client.end();
  });
}

function start(args) {
  args = minimist(args, {
    string: ['hostname', 'username', 'password', 'key', 'cert', 'ca', 'message'],
    integer: ['port', 'qos'],
    boolean: ['stdin', 'retain', 'help', 'insecure'],
    alias: {
      port: 'p',
      hostname: ['h', 'host'],
      topic: 't',
      message: 'm',
      qos: 'q',
      clientId: ['i', 'id'],
      retain: 'r',
      username: 'u',
      password: 'P',
      stdin: 's',
      protocol: ['C', 'l'],
      msgpack: 'M',
      help: 'H',
      ca: 'cafile'
    },
    default: {
      host: 'localhost',
      qos: 0,
      retain: false,
      topic: ''
    }
  });

  if (args.help) {
    return helpMe.toStdout('publish');
  }

  if (args.key) {
    args.key = fs.readFileSync(args.key);
  }

  if (args.cert) {
    args.cert = fs.readFileSync(args.cert);
  }

  if (args.ca) {
    args.ca = fs.readFileSync(args.ca);
  }

  if (args.key && args.cert && !args.protocol) {
    args.protocol = 'mqtts';
  }

  if (!args.msgpack) {
    args.codec = 'json';
  }

  if (args.port) {
    if (typeof args.port !== 'number') {
      console.warn('# Port: number expected, \'%s\' was given.', typeof args.port);
      return;
    }
  }

  if (args['will-topic']) {
    args.will = {};
    args.will.topic = args['will-topic'];
    args.will.payload = args['will-message'];
    args.will.qos = args['will-qos'];
    args.will.retain = args['will-retain'];
  }

  if (args.insecure) {
    args.rejectUnauthorized = false;
  }

  args.topic = args.topic || args._.shift();
  args.message = args.message || args._.shift() || '';


  if (!args.topic) {
    console.error('missing topic\n');
    return helpMe.toStdout('publish');
  }
  args.topic = args.topic.toString();

  if (typeof args.message !== 'string') {
    args.message = args.message.toString().trim();
  }

  if (args.stdin) {
    process.stdin.pipe(concat(function (data) {
      args.message = data.toString().trim();
      send(args);
    }));
  } else {
    send(args);
  }
}

module.exports = start;

if (require.main === module) {
  start(process.argv.slice(2));
}

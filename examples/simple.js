"use strict";

const mqttr = require('../');

// You should start a mqtt server at 1883 before or after run this script
const client = mqttr.connect('mqtt://localhost');

client.on('connect', function () {
  console.log('connect');
});

client.on('reconnect', function () {
  console.log('reconnect');
});

client.on('close', function () {
  console.log('close');
});

client.on('offline', function () {
  console.log('offline');
});

client.on('error', function (err) {
  throw err;
});

// full params handler
client.subscribe('/users/:userid/message/:messageid/*', function (topic, payload, message) {
  console.log('-------------------------------------------------');
  console.log('topic  :', topic);             // /users/taoyuan/message/4321/ping
  console.log('message:', payload);           // { hello: 'world' }
  console.log('params :', message.params);    // { userid: 'taoyuan', messageid: 4321 }
  console.log('slats  :', message.splats);    // [ 'ping' ]
  console.log('path   :', message.path);      // '/users/:userid/message/:messageid/:method'
  console.log('packet :', message.packet);    // {...} packet received packet, as defined in mqtt-packet
  console.log();
});

// one context param handler
client.subscribe('/users/:userid/message/:messageid/*', function (message) {
  console.log('-------------------------------------------------');
  console.log(message);
  console.log();
});

client.ready(function () {
  client.publish('/users/taoyuan/message/4321/ping', {hello: '中国'});

  setTimeout(function () {
    client.end();
  }, 10);
});



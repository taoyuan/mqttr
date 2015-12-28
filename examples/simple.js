"use strict";

var mqttr = require('../');

// You should start a mqtt server at 1883 before or after run this script
var client = mqttr.connect('mqtt://localhost');

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
client.subscribe('/users/:userid/message/:messageid/*', function (topic, message, context) {
  console.log('-------------------------------------------------');
  console.log('topic  :', topic);             // /users/taoyuan/message/4321/ping
  console.log('message:', message);           // { hello: 'world' }
  console.log('params :', context.params);    // { userid: 'taoyuan', messageid: 4321 }
  console.log('slats  :', context.splats);    // [ 'ping' ]
  console.log('path   :', context.path);      // '/users/:userid/message/:messageid/:method'
  console.log();
});

// one context param handler
client.subscribe('/users/:userid/message/:messageid/*', function (context) {
  console.log('-------------------------------------------------');
  console.log(context);
  console.log();
});

client.ready(function () {
  client.publish('/users/taoyuan/message/4321/ping', {hello: 'world'});
});

setTimeout(function () {
  client.end();
}, 10);

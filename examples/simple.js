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

client.subscribe('/users/:userid/message/:messageid/*', function (topic, message, route) {
  console.log('-------------------------------------------------');
  console.log('message:', message);            // { hello: 'world' }
  console.log('topic  :', route.topic);     // '/users/ty/message/4321/ping'
  console.log('params :', route.params);    // { userid: 'taoyuan', messageid: 4321 }
  console.log('slats  :', route.splats);    // [ 'ping' ]
  console.log('path   :', route.path);      // '/users/:userid/message/:messageid/:method'
  console.log('-------------------------------------------------');
  client.end();
});

client.ready(function () {
  client.publish('/users/taoyuan/message/4321/ping', {hello: 'world'});
});

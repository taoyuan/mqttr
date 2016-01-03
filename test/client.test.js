'use strict';

var t = require('chai').assert;
var s = require('./support');
var mqttr = require('../');

describe('Client', function () {

  var server, client;

  before(function (done) {
    s.createMqttServer({logger: {level: 'error'}}, function (err, _server) {
      if (err) throw err;
      server = _server;
      done();
    });
  });

  after(function (done) {
    server.close(done);
  });

  beforeEach(function (done) {
    client = mqttr.connect(server.url);
    client.once('connect', function () {
      done();
    });
  });

  afterEach(function (done) {
    client.end(done);
  });

  it('should work', function (done) {
    client.subscribe('$hello/:name', function (topic, payload, message) {
      t.equal(message.params.name, 'foo');
      t.deepEqual(payload, {a: 1});
      done();
    });

    client.publish('$hello/foo', {a: 1});

  });

  it('should work with two clients', function (done) {
    var client2 = mqttr.connect(server.url);
    client2.subscribe('$hello/:name', function (topic, payload, message) {
      t.equal(message.params.name, 'foo');
      t.deepEqual(payload, {a: 1});
      client2.end(done);
    });

    client2.ready(function () {
      client.publish('$hello/foo', {a: 1});
    });
  });

  it('should work with char wild char', function (done) {
    var data = {boo: 'foo'};
    client.subscribe('foo/*', function (topic, payload) {
      t.equal('foo/bar', topic);
      t.deepEqual(data, payload);
      done();
    });
    client.publish('foo/bar', data);
  });

  it('should work with two char wild char', function (done) {
    var data = {boo: 'foo'};
    client.subscribe('foo/**', function (topic, payload) {
      t.equal('foo/bar/hello', topic);
      t.deepEqual(data, payload);
      done();
    });
    client.publish('foo/bar/hello', data);
  });

  it('should work with params', function (done) {
    var data = {boo: 'foo'};
    client.subscribe('foo/:bar', function (topic, payload, route) {
      t.deepEqual(data, payload);
      t.equal(route.params.bar, 'bar');
      done();
    });
    client.publish('foo/bar', data);
  });

  it('should not received data when subscription cancelled', function (done) {
    var i = 0;
    var sub = client.subscribe('$hello/:name', function () {
      if (i === 0) return ++i;
      t.fail('Should not run here');
    });

    client.publish('$hello/foo', {a: 1});
    sub.cancel();
    client.publish('$hello/foo', {a: 1});

    setTimeout(done, 500);
  });

  it('should support custom log', function (done) {
    var messages = [];
    var log = {
      debug: function (msg) {
        messages.push(msg);
      }
    };
    var c = mqttr.connect(server.url, {log: log});
    c.end(function () {
      t.isAbove(messages.length, 0);
      done();
    });
  });

});

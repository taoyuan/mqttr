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
    client.subscribe('$hello/:name', function (topic, message, matched) {
      t.equal(matched.params.name, 'foo');
      t.deepEqual(message, {a: 1});
      done();
    });

    client.publish('$hello/foo', {a: 1});

  });

  it('should work with two clients', function (done) {
    var client2 = mqttr.connect(server.url);
    client2.subscribe('$hello/:name', function (topic, message, matched) {
      t.equal(matched.params.name, 'foo');
      t.deepEqual(message, {a: 1});
      client2.end(done);
    });

    client2.ready(function () {
      client.publish('$hello/foo', {a: 1});
    });
  });

  it('should work with char wild char', function (done) {
    var data = {boo: 'foo'};
    client.subscribe('foo/*', function (topic, message) {
      t.deepEqual(data, message);
      done();
    });
    client.publish('foo/bar', data);
  });

  it('should work with params', function (done) {
    var data = {boo: 'foo'};
    client.subscribe('foo/:bar', function (topic, message, route) {
      t.deepEqual(data, message);
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

});

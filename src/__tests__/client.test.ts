import {expect} from '@tib/testlab';
import * as mqtt from 'async-mqtt';
import {Aedes} from 'aedes';
import {Server} from 'net';
import * as s from './support';
import {Deferred, delay, noop} from './support';
import {Client, Message} from '..';
import getPort from 'get-port';

describe('Client', () => {
  describe('connectivity', () => {
    it('should connect', async () => {
      const d = new Deferred();
      const [aedes, server, port] = await s.createMQTTServer();

      const client = new Client(mqtt.connect({port}));
      expect(client.connected).not.ok();
      expect(client.disconnecting).not.ok();
      expect(client.disconnected).not.ok();
      expect(client.reconnecting).not.ok();

      client.once('connect', () => d.resolve());
      await d;
      expect(client.connected).ok();
      expect(client.disconnecting).not.ok();
      expect(client.disconnected).not.ok();
      expect(client.reconnecting).not.ok();

      await client.end(true);
      await s.close(aedes, server);
    });

    it('should reconnect', async () => {
      const d = new Deferred();
      // eslint-disable-next-line prefer-const
      let [aedes, server, port] = await s.createMQTTServer();

      const client = new Client(mqtt.connect({port}));
      client.on('error', noop);
      client.once('reconnect', () => d.resolve());

      await client.ready();

      // close server
      await s.close(aedes, server);

      // restart server
      [aedes, server] = await s.createMQTTServer({port});

      // wait a little while
      await delay(50);

      // should reconnecting
      expect(client.connected).not.ok();
      expect(client.reconnecting).ok();

      // should reconnected
      await d;

      await client.end(true);
      await s.close(aedes, server);
    });

    it('should emit error if can not connect', async () => {
      const d = new Deferred();
      const port = await getPort();
      const client = new Client(mqtt.connect({port}));
      client.once('error', () => d.resolve());
      await d;
      await client.end(true);
    });

    it('should return immediately to call ready if has been connected', async () => {
      const d = new Deferred();
      const [aedes, server, port] = await s.createMQTTServer();

      const client = new Client(mqtt.connect({port}));
      client.once('connect', () => d.resolve());
      await d;
      await client.ready();

      await client.end(true);
      await s.close(aedes, server);
    });
  });

  describe('pub/sub', () => {
    let aedes: Aedes;
    let server: Server;
    let port: number;

    let url: string;

    let client: Client;

    before(async () => {
      [aedes, server, port] = await s.createMQTTServer();
      url = `mqtt://127.0.0.1:${port}`;
    });

    after(async () => {
      await s.close(aedes, server);
    });

    beforeEach(done => {
      client = new Client(mqtt.connect(url));
      client.once('connect', () => done());
    });

    afterEach(async () => {
      await client.end(true);
    });

    it('should work', async () => {
      const d = new Deferred();

      await client.subscribe('$hello/:name', function (
        topic,
        payload,
        message,
      ) {
        expect(message!.params.name).equal('foo');
        expect(payload).deepEqual({a: 1});
        d.resolve();
      });

      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should work with multiple clients', async () => {
      const d = new Deferred();

      const client2 = new Client(mqtt.connect(url));
      await client2.subscribe('$hello/:name', async function (
        topic,
        payload,
        message,
      ) {
        expect(message!.params.name).equal('foo');
        expect(payload).deepEqual({a: 1});
        await client2.end(true);
        d.resolve();
      });

      await client2.ready();
      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should work with char wild char', async () => {
      const d = new Deferred();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:splat*', function (topic, payload) {
        expect(topic).equal('foo/bar');
        expect(data).deepEqual(payload);
        d.resolve();
      });
      await client.publish('foo/bar', data);
      await d;
    });

    it('should work with two char wild char', async () => {
      const d = new Deferred();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:splats*', function (
        topic,
        payload,
        message,
      ) {
        try {
          expect(topic).equal('foo/bar/hello');
          expect(message?.params).containDeep({splats: ['bar', 'hello']});
          expect(data).deepEqual(payload);
          d.resolve();
        } catch (e) {
          d.reject(e);
        }
      });
      await client.publish('foo/bar/hello', data);
      await d;
    });

    it('should work with params', async () => {
      const d = new Deferred();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:bar', function (topic, payload, route) {
        expect(data).deepEqual(payload);
        expect(route!.params.bar).equal('bar');
        d.resolve();
      });
      await client.publish('foo/bar', data);
      await d;
    });

    it('should match the matched topic', async () => {
      let caught = false;
      const data = {boo: 'foo'};

      await client.subscribe('foo/should_not_match/:bar', function (
        topic,
        payload,
        route,
      ) {
        throw new Error('should not enter here');
      });

      await client.subscribe('foo/:bar', function (topic, payload, route) {
        expect(data).deepEqual(payload);
        expect(route!.params.bar).equal('bar');
        caught = true;
      });
      await client.publish('foo/bar', data);
      await delay(500);
      expect(caught).ok();
    });

    it('should not matched when subscription cancelled', async () => {
      const messages: Message[] = [];
      const sub = await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      await client.publish('$hello/foo', {a: 1});
      await s.delay(50);

      await sub.cancel();
      await client.publish('$hello/foo', {a: 1});

      await s.delay(50);
      expect(messages).lengthOf(1);
    });

    it('should not matched when subscription.cancelled set as true', async () => {
      const messages: Message[] = [];
      const sub = await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      await client.publish('$hello/foo', {a: 1});
      await s.delay(50);

      sub.cancelled = true;
      await client.publish('$hello/foo', {a: 1});

      await s.delay(50);
      expect(messages).lengthOf(1);
    });

    it('should not matched if route has been deleted', async () => {
      const messages: Message[] = [];
      await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      // force clear routes. It should not happened, here just for testing
      client.router.routes = [];

      await client.publish('$hello/foo', {a: 1});
      await s.delay(50);
      expect(messages).lengthOf(0);
    });

    it('should do nothing to call cancel after subscription has been canceled', async () => {
      const sub = await client.subscribe('$hello/:name', () => {
        throw new Error('Should not run here');
      });

      expect(sub.cancelled).false();
      expect(sub.client.router).lengthOf(1);

      await sub.cancel();
      expect(sub.cancelled).true();
      expect(sub.client.router).lengthOf(0);

      await sub.cancel();
    });

    it('should work with single parameter subscription handler', async () => {
      const d = new Deferred();

      await client.subscribe('$hello/:name', function (message: Message) {
        expect(message.params.name).equal('foo');
        expect(message.payload).deepEqual({a: 1});
        d.resolve();
      });

      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should unsubscribe', async () => {
      const messages: Message[] = [];

      await client.subscribe('$hello1/:name', function (message: Message) {
        messages.push(message);
      });

      await client.subscribe('$hello2/:name', function (message: Message) {
        messages.push(message);
      });

      await client.publish('$hello1/foo', {a: 1});
      await client.publish('$hello2/foo', {a: 2});
      await client.unsubscribe(['$hello1/:name']);
      await client.publish('$hello1/foo', {a: 3});
      await client.publish('$hello2/foo', {a: 4});

      await delay(50);
      expect(messages).lengthOf(3);
    });

    it('should emit error when sub handler has an exception', async function () {
      const d = new Deferred();

      client.once('error', err => {
        try {
          expect(err.message).match(/Boom!/);
          d.resolve();
        } catch (e) {
          d.reject(e);
        }
      });
      await client.subscribe('$hello/:name', function () {
        throw new Error('Boom!');
      });

      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should support "(.*)" in topic', async function () {
      const d = new Deferred();

      await client.subscribe('$hello/(.*)', function (message: Message) {
        try {
          expect(message.params).containDeep({0: 'foo/bar'});
          d.resolve();
        } catch (e) {
          d.reject(e);
        }
      });

      await client.publish('$hello/foo/bar', {a: 1});

      await d;
    });
  });
});

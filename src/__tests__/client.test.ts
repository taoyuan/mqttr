import {Server} from 'net';
import getPort from 'get-port';
import {Aedes} from 'aedes';
import * as mqtt from 'mqtt';
import {defer} from '@jil/common/async/defer';
import {delay} from '@jil/common/async/timeout';
import * as s from './support';
import {Client, Message, Subscription} from '..';
import {noop} from './support';

class HackedSubscription extends Subscription {
  _cancelled: boolean;
}

describe('Client', () => {
  describe('connectivity', () => {
    it('should connect', async () => {
      const d = defer();
      const [aedes, server, port] = await s.createMQTTServer();

      const client = new Client(mqtt.connect({port}));
      expect(client.connected).toBeFalsy();
      expect(client.disconnecting).toBeFalsy();
      expect(client.disconnected).toBeFalsy();
      expect(client.reconnecting).toBeFalsy();

      client.once('connect', () => d.resolve());
      await d;
      expect(client.connected).toBeTruthy();
      expect(client.disconnecting).toBeFalsy();
      expect(client.disconnected).toBeFalsy();
      expect(client.reconnecting).toBeFalsy();

      await client.end(true);
      await s.close(aedes, server);
    });

    it('should reconnect', async () => {
      const d = defer();
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
      expect(client.connected).toBeFalsy();
      expect(client.reconnecting).toBeTruthy();

      // should reconnected
      await d;

      await client.end(true);
      await s.close(aedes, server);
    });

    it('should emit error if can not connect', async () => {
      const d = defer();
      const port = await getPort();
      const client = new Client(mqtt.connect({port}));
      client.once('error', () => d.resolve());
      await d;
      await client.end(true);
    });

    it('should return immediately to call ready if has been connected', async () => {
      const d = defer();
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

    beforeAll(async () => {
      [aedes, server, port] = await s.createMQTTServer();
      url = `mqtt://127.0.0.1:${port}`;
    });

    afterAll(async () => {
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
      const d = defer();

      await client.subscribe('$hello/:name', function (topic, payload, message) {
        expect(message!.params.name).toEqual('foo');
        expect(payload).toEqual({a: 1});
        d.resolve();
      });

      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should work with multiple clients', async () => {
      const d = defer();

      const client2 = new Client(mqtt.connect(url));
      await client2.subscribe('$hello/:name', async function (topic, payload, message) {
        expect(message!.params.name).toEqual('foo');
        expect(payload).toEqual({a: 1});
        await client2.end(true);
        d.resolve();
      });

      await client2.ready();
      await client.publish('$hello/foo', {a: 1});

      await d;
    });

    it('should work with char wild char', async () => {
      const d = defer();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:splat*', function (topic, payload) {
        expect(topic).toEqual('foo/bar');
        expect(data).toEqual(payload);
        d.resolve();
      });
      await client.publish('foo/bar', data);
      await d;
    });

    it('should work with two char wild char', async () => {
      const d = defer();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:splats*', function (topic, payload, message) {
        try {
          expect(topic).toEqual('foo/bar/hello');
          expect(message?.params).toEqual({splats: ['bar', 'hello']});
          expect(data).toEqual(payload);
          d.resolve();
        } catch (e) {
          d.reject(e);
        }
      });
      await client.publish('foo/bar/hello', data);
      await d;
    });

    it('should work with params', async () => {
      const d = defer();
      const data = {boo: 'foo'};
      await client.subscribe('foo/:bar', function (topic, payload, route) {
        expect(data).toEqual(payload);
        expect(route!.params.bar).toEqual('bar');
        d.resolve();
      });
      await client.publish('foo/bar', data);
      await d;
    });

    it('should match the matched topic', async () => {
      let caught = false;
      const data = {boo: 'foo'};

      await client.subscribe('foo/should_not_match/:bar', function () {
        throw new Error('should not enter here');
      });

      await client.subscribe('foo/:bar', function (topic, payload, route) {
        expect(data).toEqual(payload);
        expect(route!.params.bar).toEqual('bar');
        caught = true;
      });
      await client.publish('foo/bar', data);
      await delay(500);
      expect(caught).toBeTruthy();
    });

    it('should not matched when subscription cancelled', async () => {
      const messages: Message[] = [];
      const sub = await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      expect(sub.topic).toEqual('$hello/:name');

      await client.publish('$hello/foo', {a: 1});
      await delay(50);

      await sub.cancel();
      await client.publish('$hello/foo', {a: 1});

      await delay(50);
      expect(messages).toHaveLength(1);
    });

    it('should not matched when subscription.cancelled set as true', async () => {
      const messages: Message[] = [];
      const sub = await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      await client.publish('$hello/foo', {a: 1});
      await delay(50);

      (sub as HackedSubscription)._cancelled = true;
      await client.publish('$hello/foo', {a: 1});

      await delay(50);
      expect(messages).toHaveLength(1);
    });

    it('should not matched if route has been deleted', async () => {
      const messages: Message[] = [];
      await client.subscribe('$hello/:name', (message: Message) => {
        messages.push(message);
      });

      // force clear routes. It should not happened, here just for testing
      client.router.routes = [];

      await client.publish('$hello/foo', {a: 1});
      await delay(50);
      expect(messages).toHaveLength(0);
    });

    it('should do nothing to call cancel after subscription has been canceled', async () => {
      const sub = await client.subscribe('$hello/:name', () => {
        throw new Error('Should not run here');
      });

      expect(sub.cancelled).toBe(false);

      await sub.cancel();
      expect(sub.cancelled).toBe(true);

      await sub.cancel();
    });

    it('should work with single parameter subscription handler', async () => {
      const d = defer();

      await client.subscribe('$hello/:name', function (message: Message) {
        expect(message.params.name).toEqual('foo');
        expect(message.payload).toEqual({a: 1});
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
      expect(messages).toHaveLength(3);
    });

    it('should emit error when sub handler has an exception', async function () {
      const d = defer();

      client.once('error', err => {
        try {
          expect(err.message).toMatch(/Boom!/);
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
      const d = defer();

      await client.subscribe('$hello/(.*)', function (message: Message) {
        try {
          expect(message.params).toEqual({0: 'foo/bar'});
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

# mqttr

[![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Coverage percentage][coveralls-image]][coveralls-url]

> A routable mqtt library based on mqtt.js

## Installation

```sh
$ npm i mqttr
```

## Usage

```typescript
import {connect, Message} from 'mqttr';

// eslint-disable-next-line  @typescript-eslint/no-floating-promises
(async () => {
  // You should start a mqtt server at 1883 before or after run this script
  const client = connect('mqtt://localhost');

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

  client.on('error', function (err: Error) {
    throw err;
  });

  // full params handler
  await client.subscribe(
    '/users/:userId/message/:messageId/:splats*',
    (topic: string, payload: any, message?: Message) => {
      message = message!;
      console.log('-------------------------------------------------');
      console.log('topic  :', topic); // => /users/yvan/message/4321/ping
      console.log('message:', payload); // => { hello: '🦄' }
      console.log('params :', message.params); // => { userId: 'yvan', messageId: 4321, splats: [ 'ping' ] }
      console.log('path   :', message.path); // => '/users/:userId/message/:messageId/:splats*'
      console.log('packet :', message.packet); // => {...} packet received packet, as defined in mqtt-packet
      console.log();
    },
  );

  // one context param handler
  await client.subscribe(
    '/users/:userId/message/:messageId/:splats*',
    (message: Message) => {
      console.log('-------------------------------------------------');
      console.log(message);
      console.log();
    },
  );

  await client.ready();

  await client.publish('/users/yvan/message/4321/ping', {hello: '🦄'});

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(() => client.end(true), 10);
})();
```

## Topic Patterns

See [path-to-regexp](https://github.com/pillarjs/path-to-regexp)

## License

MIT © [taoyuan](towyuan#outlook.com)

[npm-image]: https://badge.fury.io/js/mqttr.svg
[npm-url]: https://npmjs.org/package/mqttr
[travis-image]: https://travis-ci.org/taoyuan/mqttr.svg?branch=master
[travis-url]: https://travis-ci.org/taoyuan/mqttr
[daviddm-image]: https://david-dm.org/taoyuan/mqttr.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/taoyuan/mqttr
[coveralls-image]: https://coveralls.io/repos/taoyuan/mqttr/badge.svg
[coveralls-url]: https://coveralls.io/r/taoyuan/mqttr

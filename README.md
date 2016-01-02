# mqttr [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> A routable mqtt library based on mqtt.js

## Installation

```sh
$ npm install --save mqttr
```

<a name="usage"></a>
## Usage

```js
var mqttr = require('mqttr');

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
  client.publish('/users/taoyuan/message/4321/ping', {hello: 'world'});

  setTimeout(function () {
    client.end();
  }, 10);
});

```


<a name="cli"></a>
## Command Line Tools

`mqttr` bundles a command to interact with a broker.
In order to have it available on your path, you should install `mqttr` globally:

```sh
npm install mqttr -g
```

Then, on one terminal

```
mqttr sub -t 'hello' -h 'test.mosquitto.org' -v
```

On another

```
mqttr pub -t 'hello' -h 'test.mosquitto.org' -m 'from mqttr'
```

See `mqttr help <command>` for the command help.


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

import {connect, Message} from '..';

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
  await client.subscribe('/users/:userId/message/:messageId/:splats*', (message: Message) => {
    console.log('-------------------------------------------------');
    console.log(message);
    console.log();
  });

  await client.ready();

  await client.publish('/users/yvan/message/4321/ping', {hello: '🦄'});

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  setTimeout(() => client.end(true), 10);
})();

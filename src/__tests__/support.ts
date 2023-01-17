import * as net from 'net';
import {Aedes, AedesOptions} from 'aedes';
import getPort from 'get-port';
import {createServer} from 'aedes-server-factory';

export const noop = () => {};

export interface CreateMQTTServerOptions extends AedesOptions {
  port?: number;
}

export async function createMQTTServer(options?: CreateMQTTServerOptions): Promise<[Aedes, net.Server, number]> {
  options = options ?? {};
  const port = options.port ?? (await getPort());

  const aedes = require('aedes')(options);
  const server = createServer(aedes);

  return new Promise(resolve => {
    server.listen(port, function () {
      resolve([aedes, server, port]);
    });
  });

  // const aedes = createAedesServer(options);
  // const server = net.createServer(aedes.handle);
  // return new Promise((resolve, reject) => {
  //   let handler = () => resolve([aedes, server, port]);
  //   const errorHandler = (err: Error) => {
  //     handler = () => {};
  //     reject(err);
  //   };
  //   server.listen(port, () => {
  //     server.removeListener('error', errorHandler);
  //     handler();
  //   });
  //   server.once('error', errorHandler);
  // });
}

export async function close(aedes: Aedes, server: net.Server) {
  await new Promise(resolve => aedes.close(() => resolve(undefined)));
  await new Promise(resolve => server.close(() => resolve(undefined)));
}

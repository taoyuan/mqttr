import * as net from 'net';
import {Aedes, AedesOptions, Server as createAedesServer} from 'aedes';
import getPort from 'get-port';
import {Defer} from '@tib/defer';

export const noop = () => {};

export interface CreateMQTTServerOptions extends AedesOptions {
  port?: number;
}

export async function createMQTTServer(
  options?: CreateMQTTServerOptions,
): Promise<[Aedes, net.Server, number]> {
  options = options ?? {};
  const port = options.port ?? (await getPort());

  const aedes = createAedesServer(options);
  const server = net.createServer(aedes.handle);
  return new Promise((resolve, reject) => {
    let handler = () => resolve([aedes, server, port]);
    const errorHandler = (err: Error) => {
      handler = () => {};
      reject(err);
    };
    server.listen(port, () => {
      server.removeListener('error', errorHandler);
      handler();
    });
    server.once('error', errorHandler);
  });
}

export async function close(aedes: Aedes, server: net.Server) {
  let d = new Defer();
  aedes.close(() => d.resolve());
  await d;

  d = new Defer();
  server.close(() => d.resolve());
  await d;
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

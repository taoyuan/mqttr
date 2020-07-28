import * as net from 'net';
import {Aedes, AedesOptions, Server as createAedesServer} from 'aedes';
import getPort from 'get-port';

export const noop = () => {};

export class Deferred<T> implements Promise<T> {
  private _resolve: (value?: T | PromiseLike<T>) => void;
  private _reject: (reason?: any) => void;
  private promise: Promise<T>;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<T | TResult> {
    return this.promise.then(onrejected);
  }

  resolve(val?: T) {
    this._resolve(val);
  }

  reject(reason?: any) {
    this._reject(reason);
  }

  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.promise.finally(onfinally);
  }

  [Symbol.toStringTag]: 'Promise';
}

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
  let d = new Deferred();
  aedes.close(() => d.resolve());
  await d;

  d = new Deferred();
  server.close(() => d.resolve());
  await d;
}

export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

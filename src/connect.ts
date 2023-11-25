import {IClientOptions} from 'mqtt';
import * as mqtt from 'mqtt';
import {Codec} from './types';
import {Client, ClientOptions} from './client';

export interface ConnectOptions extends IClientOptions {
  codec?: Codec;
}

export function connect(opts?: ConnectOptions): Client;
export function connect(url?: string, opts?: ConnectOptions): Client;
export function connect(url?: string | ConnectOptions, opts?: ConnectOptions): Client {
  if (typeof url === 'object') {
    opts = url;
    url = undefined;
  }
  opts = Object.assign({qos: 1}, opts);
  const client = url != null ? mqtt.connect(url, opts) : mqtt.connect(opts);
  return new Client(client, <ClientOptions>opts);
}

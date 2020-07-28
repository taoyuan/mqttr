import msgpack5 from 'msgpack5';
import {Codec, Constructor} from '../types';

export interface MsgpackCoder<T> {
  clazz: Constructor<T>;
  encode: (obj: T) => Buffer;
  decode: (data: Buffer) => T;
}

export interface MsgpackCodecOptions {
  coders: Record<number | string, MsgpackCoder<any>>;
}

export class MsgpackCodec implements Codec {
  readonly name = 'json';

  msgpack: msgpack5.MessagePack;

  constructor(options?: Partial<MsgpackCodecOptions>) {
    this.msgpack = msgpack5();
    const coders = options?.coders ?? {};
    for (const key of Object.keys(coders)) {
      const type = parseInt(key);
      const {clazz, encode, decode} = coders[type];
      this.msgpack.register(type, clazz, encode, decode);
    }
  }

  encode(data: any): any {
    return this.msgpack.encode(data);
  }

  decode(data: string | Buffer): any {
    if (typeof data === 'string') {
      data = Buffer.from(data, 'hex');
    }
    return this.msgpack.decode(data);
  }
}

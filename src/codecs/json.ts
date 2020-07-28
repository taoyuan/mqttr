import {Codec} from '../types';

export type JsonTransform = (this: any, key: string, value: any) => any;

export interface JsonCodecOptions {
  replacer: JsonTransform;
  reviver: JsonTransform;
}

export class JsonCodec implements Codec {
  readonly name = 'json';

  protected replacer?: JsonTransform;
  protected reviver?: JsonTransform;

  constructor(options?: Partial<JsonCodecOptions>) {
    this.replacer = options?.replacer;
    this.reviver = options?.reviver;
  }

  encode(data: any): any {
    return JSON.stringify(data, this.replacer);
  }

  decode(data: string | Buffer): any {
    if (Buffer.isBuffer(data)) {
      data = data.toString('utf-8');
    }
    return JSON.parse(data, this.reviver);
  }
}

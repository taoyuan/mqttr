import {Codec} from '../types';

export class RawCodec implements Codec {
  readonly name = 'raw';

  decode(data: any): any {
    return data;
  }

  encode(data: string | Buffer): any {
    return data;
  }
}

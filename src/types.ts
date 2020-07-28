export type AsyncOrSync<T> = Promise<T> | T;

export type Constructor<T> = new (...args: any[]) => T;

export interface Codec {
  name: string;
  encode: (data: any) => any;
  decode: (data: string | Buffer) => any;
}

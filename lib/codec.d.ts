/// <reference types="node" />
export interface Codec {
    name: string;
    encode: (data: string | Buffer) => any;
    decode: (data: string | Buffer) => any;
}
export declare function raw(): Codec;
export declare function json(options?: {
    [name: string]: any;
}): Codec;
export declare function msgpack(options?: {
    [name: string]: any;
}): Codec;

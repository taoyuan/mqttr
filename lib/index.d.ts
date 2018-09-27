import { IClientOptions } from "mqtt";
import { Client } from "./client";
import { Codec } from "./codec";
export declare const codec: any;
export * from "./router";
export * from "./client";
export * from "./subscription";
export interface ConnectOptions extends IClientOptions {
    codec?: string | Codec;
}
export declare function connect(opts?: ConnectOptions): Client;
export declare function connect(url?: string, opts?: ConnectOptions): Client;

import { Client } from "./client";
import { PromiseCallback } from "./utils";
export declare class Subscription {
    client: Client;
    cancelled: boolean;
    topic: string;
    handler: Function;
    constructor(client: Client, topic: string, handler: Function);
    cancel(cb?: (() => void) | PromiseCallback): Promise<any> | undefined;
}

import { Client } from "./client";
export declare class Subscription {
    client: Client;
    cancelled: boolean;
    topic: string;
    handler: Function;
    constructor(client: Client, topic: string, handler: Function);
    cancel(cb: any): void;
}

import { Client, SubscribeHandler } from "./client";
export declare class Subscription {
    client: Client;
    cancelled: boolean;
    topic: string;
    handler: SubscribeHandler;
    constructor(client: Client, topic: string, handler: SubscribeHandler);
    cancel(cb: any): void;
}

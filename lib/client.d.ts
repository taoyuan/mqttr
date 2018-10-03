/// <reference types="node" />
import { ClientSubscribeCallback, IClientSubscribeOptions, MqttClient } from "mqtt";
import { Codec } from "./codec";
import { EventEmitter } from 'events';
import { Router } from './router';
import { Subscription } from './subscription';
export interface LogFn {
    (...args: any[]): void;
}
export interface Logger {
    trace: LogFn;
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
    fatal: LogFn;
}
export interface ClientOptions {
    codec?: Codec;
    log: any;
}
export interface Message {
    topic: string;
    payload: any;
    params: {
        [name: string]: string;
    };
    splats: string[];
    path: string;
    packet: any;
}
export interface StandardSubHandler {
    (message: Message): void;
}
export interface ExpandedSubHandler {
    (topic: string, payload: any, message?: Message): void;
}
export declare type SubHandler = StandardSubHandler | ExpandedSubHandler;
export declare class Client extends EventEmitter {
    mqttclient: MqttClient;
    codec: Codec;
    log: Logger;
    router: Router;
    constructor(mqttclient: MqttClient, options?: ClientOptions, log?: any);
    readonly connected: boolean;
    readonly disconnecting: boolean;
    readonly disconnected: boolean;
    readonly reconnecting: boolean;
    _connected(): Promise<void>;
    _subscribe(topic: string, options?: IClientSubscribeOptions | ClientSubscribeCallback, cb?: ClientSubscribeCallback): void;
    _unsubscribe(topic: any, cb: any): void;
    _handleMessage(topic: string, payload: any, packet: any): void;
    ready(cb: any): this | undefined;
    subscribe(topic: string, handler: SubHandler, cb?: ClientSubscribeCallback): Subscription;
    subscribe(topic: string, handler: SubHandler, options: IClientSubscribeOptions, cb?: ClientSubscribeCallback): Subscription;
    publish(topic: any, message: any, options?: any, cb?: any): void;
    end(force?: any, cb?: any): void;
}

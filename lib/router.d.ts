export interface Matched {
    params: {
        [name: string]: string;
    };
    splats: string[];
    route: string;
    current: number;
    data?: any;
    next?: (startAt?: number) => Matched | undefined;
}
export declare class Route {
    path: string;
    keys: string[];
    re: RegExp;
    src: string;
    data: any;
    constructor(path: string);
}
export declare class Router {
    routes: Route[];
    constructor();
    add(path: string, data?: any): void;
    remove(path: string | RegExp, data?: any): void;
    match(path: string, startAt?: number): Matched | undefined;
}
export declare function pathToRegExp(path: string, keys: any[]): RegExp;
export declare function match(routes: Route[], uri: string, startAt?: number): Matched | undefined;

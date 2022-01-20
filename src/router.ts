import {
  match as createMatch,
  MatchFunction,
  MatchResult,
  ParseOptions,
  RegexpToFunctionOptions,
  TokensToRegexpOptions,
} from 'path-to-regexp';

export interface Matched extends MatchResult<Record<string, any>> {
  index: number;
  route: string;
  data?: any;
  next: (startAt?: number) => Matched | undefined;
}

/**
 * Convert path to route object
 *
 * A string or RegExp should be passed,
 * will return { re, src, keys} obj
 *
 * @param  {String / RegExp} path
 */
export class Route {
  match: MatchFunction;
  path: string;
  src: string;
  data: any;

  constructor(path: string, options?: ParseOptions & TokensToRegexpOptions & RegexpToFunctionOptions) {
    this.path = path;
    path = path.replace(/\$/, '\\$');
    this.match = createMatch(path, options);
    this.src = path;
  }
}

/**
 * Default "normal" router constructor.
 * accepts path, data tuples via add
 * returns {fn, params, splats, path}
 *  via match
 */

export class Router {
  routes: Route[];

  constructor() {
    this.routes = [];
  }

  get length() {
    return this.routes.length;
  }

  add(path: string, data?: any) {
    if (!path) throw new Error('path can not be blank or empty');

    const route = new Route(path);
    route.data = data;

    this.routes.push(route);
  }

  remove(path: string | RegExp, data?: any) {
    if (!path) throw new Error('path can not be blank or empty');

    if (typeof path === 'string') {
      path = new RegExp(path.replace(/\$/, '\\$'), 'ig');
    }

    let i;
    const len = this.routes.length;
    for (i = 0; i < len; i++) {
      if (path.test(this.routes[i].src) && (!data || this.routes[i].data === data)) {
        break;
      }
    }
    if (i < len) this.routes.splice(i, 1);
  }

  match(path: string, startAt?: number) {
    const matched: Matched = <Matched>match(this.routes, path, startAt);
    if (matched) {
      const route = this.routes[matched.index];
      matched.data = route.data;
      matched.next = this.match.bind(this, path, matched.index + 1);
    }
    return matched;
  }
}

/**
 * Attempt to match the given request to
 * one of the routes. When successful
 * a  {fn, params, splats} obj is returned
 *
 * @param  {Array} routes
 * @param  {String} uri
 * @param  {Number} startAt
 * @return {Object}
 */
export function match(routes: Route[], uri: string, startAt?: number): Omit<Matched, 'next'> | undefined {
  startAt = startAt ?? 0;
  for (let len = routes.length, i = startAt; i < len; ++i) {
    const route = routes[i];
    const matched = route.match(uri);
    if (matched) {
      return {
        ...matched,
        index: i,
        route: route.src,
      };
    }
  }
}

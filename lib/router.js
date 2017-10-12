/**
 * Convert path to route object
 *
 * A string or RegExp should be passed,
 * will return { re, src, keys} obj
 *
 * @param  {String / RegExp} path
 */
class Route {
	constructor(path) {
		this.path = path;
		this.keys = [];

		path = path.replace(/\$/, '\\$');

		if (path instanceof RegExp) {
			this.re = path;
			this.src = path.toString();
		} else {
			this.re = pathToRegExp(path, this.keys);
			this.src = path;
		}
	}
}

/**
 * Default "normal" router constructor.
 * accepts path, data tuples via add
 * returns {fn, params, splats, path}
 *  via match
 */

class Router {
	constructor() {
		this.routes = [];
	}

	add(path, data) {
		if (!path) throw new Error(' route requires a path');

		const route = new Route(path);
		route.data = data;

		this.routes.push(route);
	}

	remove(path, data) {
		if (!path) throw new Error('path must not be null');

		if (path instanceof RegExp) {
			path = path.toString();
		}
		path = path.replace(/\$/, '\\$');

		let i;
		const len = this.routes.length;
		for (i = 0; i < len; i++) {
			if (this.routes[i].src === path && (!data || this.routes[i].data === data)) break;
		}
		if (i < len) this.routes.splice(i, 1);
	}

	match(path, startAt) {
		const matched = match(this.routes, path, startAt);
		if (matched) {
			const route = this.routes[matched.current];
			matched.data = route.data;
			matched.next = this.match.bind(this, path, matched.current + 1);
		}
		return matched;
	}
}

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String} path
 * @param  {Array} keys
 * @return {RegExp}
 */
function pathToRegExp(path, keys) {
	path = path
		.concat('/?')
		.replace(/\/\(/g, '(?:/')
		.replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?|\*/g, (_, slash, format, key, capture, optional) => {
			if (_ === '*') {
				keys.push(undefined);
				return _;
			}

			keys.push(key);
			slash = slash || '';
			return String(optional ? '' : slash) +
				'(?:' +
				(optional ? slash : '') +
				(format || '') + (capture || '([^/]+?)') + ')' +
				(optional || '');
		})
		.replace(/([/.])/g, '\\$1')
		.replace(/\*/g, '(.*)');
	return new RegExp('^' + path + '$', 'i');
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
function match(routes, uri, startAt) {
	startAt = startAt || 0;
	let captures;
	let len;
	let i;
	let j;

	for (len = routes.length, i = startAt; i < len; ++i) {
		const route = routes[i];
		const re = route.re;
		const keys = route.keys;
		const splats = [];
		const params = {};
		captures = uri.match(re);
		if (captures) {
			for (j = 1, len = captures.length; j < len; ++j) {
				const key = keys[j - 1];
				const val = typeof captures[j] === 'string' ? decodeURI(captures[j]) : captures[j];
				if (key) {
					params[key] = val;
				} else {
					splats.push(val);
				}
			}
			return {
				params,
				splats,
				route: route.src,
				current: startAt
			};
		}
	}
}

module.exports = exports = Router;

exports.Route = Route;
exports.pathToRegExp = pathToRegExp;
exports.match = match;


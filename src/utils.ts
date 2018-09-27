import * as PromiseA from "bluebird";

export interface PromiseCallback {
	(err?, data?): any;
	promise: Promise<any>;
}

export function createPromiseCallback(): PromiseCallback {
	let cb;
	const promise = new PromiseA(function(resolve, reject) {
		cb = function(err, data) {
			if (err) return reject(err);
			return resolve(data);
		};
	});
	cb.promise = promise;
	return cb;
}

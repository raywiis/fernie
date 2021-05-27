import * as http from "http";
import { routes, paths, methods, path, makeHandler } from "../src/index";
import fetch from "node-fetch";
import { delimiter } from "path/posix";

const { get, post, GET, POST, PATCH, DELETE, method: m } = methods;

paths({
	'/test': [onError(() => '404'), methods({
		GET: () => 'test',
		POST: [onError(() => '401'), (ctx) => ctx.body],
		PATCH: () => 'sick',
		DELETE: () => 'fuck'
	})]
})

function onError(customHandler) {
	return (ctx, req, res, next) => {
		let ret;
		try {
			ret = next(ctx, req, res)
		} catch (e) {
			ret = customHandler(ctx, req, res)
		}
		return ret
	}
}

const paths = {
	'/thisRandomPath': [
		m(get, () => 'wowawewawau')
	]
}

function validateMiddle<T extends Context>(ctx: T, req: http.IncomingMessage): T & { body: any } {

	return Object.assign(ctx, { body: 'test' })
}

const server = http.createServer((req, res) => {
	const s = { path: { remaining: '' } }
	doner(s, req, res);
});

const PORT = 3000;

server.listen(PORT, () => {
	console.log("server listening");
	fetch(`http://localhost:${PORT}/subpath/echo`, {
		method: 'POST',
		body: 'wowawewawau'
	})
		.then(res => {
			console.log(res)
		})
		.catch(console.error)
		.finally(() => {
			server.close();
		});
});

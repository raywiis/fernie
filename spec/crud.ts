import * as http from "http";
import { paths, methods, makeHandler, respond, ResponseGenerator } from "../src/index";
import fetch from "node-fetch";
import { delimiter } from "path/posix";

const router = paths({
	"/test": [
		onError(() => respond({ status: 404 })),
		methods({
			GET: () => respond("test"),
			// POST: [onError(() => "401"), (ctx) => ctx.body],
			PATCH: () => respond("sick"),
			DELETE: () => {
				throw new Error("Sample error")
			},
		}),
	],
});

function onError(customHandler: ResponseGenerator) {
	return (wrap) => (ctx, req) => {
		let ret;
		try {
			return wrap(ctx, req)
		} catch (e) {
			ret = customHandler(ctx, req)
		}
		return ret
	}
}

const server = http.createServer((req, res) => {
	const s = { path: { remaining: '' } }
	const handler = makeHandler(router);
	handler(req, res);
});

const PORT = 3000;

server.listen(PORT, () => {
	console.log("server listening");
	fetch(`http://localhost:${PORT}/test`, {
		method: 'GET',
	})
		.then(res => {
			console.log(res)
		})
		.catch(console.error)
		.finally(() => {
			server.close();
		});
});

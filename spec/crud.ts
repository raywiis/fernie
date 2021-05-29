import * as http from "http";
import {
	paths,
	methods,
	makeHandler,
	respond,
	ResponseGenerator,
	stack,
} from "../src/index";
import fetch from "node-fetch";
import "mocha";
import assert from "assert/strict";

const router = paths({
	"/one": () => respond("single"),
	"/two": methods({
		GET: () => respond("GET /two"),
		PUT: () => respond("PUT /two"),
		POST: () => respond("POST /two"),
		PATCH: () => respond("PATCH /two"),
		DELETE: () => respond("DELETE /two"),
	}),
	"/test": [
		onError(() => respond({ status: 404 })),
		onError(() => respond({ status: 404 })),
	].reduceRight(
		(a, b) => b(a),
		methods({
			GET: () => respond("test"),
			// POST: [onError(() => "401"), (ctx) => ctx.body],
			PATCH: () => respond("sick"),
			DELETE: () => {
				throw new Error("Sample error");
			},
		})
	),
	"/nested": paths({
		"/test": () => respond("wew"),
	}),
});

function onError(customHandler: ResponseGenerator) {
	return (wrap) => (ctx, req) => {
		let ret;
		try {
			return wrap(ctx, req);
		} catch (e) {
			ret = customHandler(ctx, req);
		}
		return ret;
	};
}

const server = http.createServer(makeHandler(router));

const PORT = 3000;

describe("Basic path stuff", () => {
	before((done) => {
		server.listen(PORT, () => {
			done();
		});
	});

	after(() => {
		server.close();
	});

	const expectGet = (url: string, expectedResponse: string, ) => {
		return async () => {
			const res = await fetch(`http://localhost:${PORT}/${url}`);
			const buffer = await res.buffer();
			assert(buffer.toString() === expectedResponse);
		};
	};

	it("should return a single response", expectGet("one", "single"));
	it("should return a nested response", expectGet("test", "test"));
	it("handles basic nested route", expectGet("nested/test", "wew"));

	it('handles different http methods', async () => {
		const methods = [
			"GET", "POST", "PUT", "PATCH", "DELETE"
		]

		for (const method of methods) {
			const res = await fetch(`http://localhost:${PORT}/two`, {
				method
			});
			const buff = await res.buffer();
			assert.equal(200, res.status);
			assert.strictEqual(buff.toString(), `${method} /two`)
		}
	})
});

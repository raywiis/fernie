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
		"/second": paths({
			"/test": () => respond("wow"),
		}),
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

	const doFetch = ({
		method = "GET",
		url,
		expectedBody,
		expectedStatus = 200,
	}) => {
		return async () => {
			const res = await fetch(`http://localhost:${PORT}/${url}`, {
				method,
			});
			const buffer = await res.buffer();
			assert.equal(res.status, expectedStatus);
			assert.equal(buffer.toString(), expectedBody);
		};
	};

	it(
		"should return a single response",
		doFetch({ url: "one", expectedBody: "single" })
	);

	it(
		"should return a nested response",
		doFetch({ url: "test", expectedBody: "test" })
	);

	it(
		"handles a nested route",
		doFetch({ url: "nested/test", expectedBody: "wew" })
	);

	it(
		"handles a doubly nested route",
		doFetch({ url: "nested/second/test", expectedBody: "wow" })
	);

	it("handles different http methods", async () => {
		const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

		for (const method of methods) {
			await doFetch({ url: "two", method, expectedBody: `${method} /two` })();
		}
	});

	it(
		"returns a 404 if nothing matches on root",
		doFetch({ url: "no-bind", expectedBody: "", expectedStatus: 404 })
	);
});

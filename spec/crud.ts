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
	"/test": stack(
		[
			onError(() => respond({ status: 404 })),
			injectData(() => ({ user: "test user" })),
		],
		methods({
			GET: (ctx) => respond(ctx.user),
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

function injectData<T>(injector: () => T) {
	return (wrap) => (ctx, req) => {
		return wrap(Object.assign({}, ctx, { ...injector() }), req);
	};
}

function onError(customHandler) {
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
		"GET /one",
		doFetch({ url: "one", expectedBody: "single" })
	);

	it(
		"POST /one",
		doFetch({ url: "one", expectedBody: "single", method: 'POST'})
	);


	it(
		"GET /test",
		doFetch({ url: "test", expectedBody: "test user" })
	);

	it(
		"GET /nested/test",
		doFetch({ url: "nested/test", expectedBody: "wew" })
	);

	it(
		"GET /nested/second/test",
		doFetch({ url: "nested/second/test", expectedBody: "wow" })
	);

	it("GET,POST,PUT,PATCH,DELETE /two", async () => {
		const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"];

		for (const method of methods) {
			await doFetch({ url: "two", method, expectedBody: `${method} /two` })();
		}
	});

	it(
		"GET /no-bind",
		doFetch({ url: "no-bind", expectedBody: "", expectedStatus: 404 })
	);
});

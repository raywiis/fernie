import * as http from "http";
import { makeHandler } from "../src/new";
import fetch from "node-fetch";
import "mocha";
import assert from "assert/strict";
import router from "./fixture";

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

	it("GET /one", doFetch({ url: "one", expectedBody: "single" }));

	it(
		"POST /one",
		doFetch({ url: "one", expectedBody: "single", method: "POST" })
	);

	it("GET,POST,PUT,PATCH,DELETE /two", async () =>
		Promise.all(
			["GET", "POST", "PUT", "PATCH", "DELETE"].map((method) =>
				doFetch({ url: "two", method, expectedBody: `${method} /two` })()
			)
		));

	it("GET /test", doFetch({ url: "test", expectedBody: "test user" }));

	it(
		"POST /test",
		doFetch({
			url: "test",
			expectedStatus: 401,
			expectedBody: "",
			method: "POST",
		})
	);

	it(
		"DELETE /test",
		doFetch({
			url: "test",
			expectedStatus: 404,
			expectedBody: "",
			method: "DELETE",
		})
	);

	it("GET /nested/test", doFetch({ url: "nested/test", expectedBody: "wew" }));

	it(
		"GET /nested/second/test",
		doFetch({ url: "nested/second/test", expectedBody: "wow" })
	);

	it(
		"GET /no-bind",
		doFetch({ url: "no-bind", expectedBody: "", expectedStatus: 404 })
	);

	it(
		"GET /params/test-param",
		doFetch({
			url: "params/test-param",
			expectedBody: '{"wew":"test-param"}',
		})
	);

	it(
		"POST /params_2/test-1/test-2",
		doFetch({
			method: "POST",
			url: "params_2/test-1/test-2",
			expectedBody: '{"first":"test-1","second":"test-2"}',
		})
	);

	it(
		"GET /params_2/test-1",
		doFetch({
			url: "params_2/test-1",
			expectedStatus: 404,
			expectedBody: "",
		})
	);
});

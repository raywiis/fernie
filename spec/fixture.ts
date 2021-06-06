import { paths, methods, respond, stack } from "../src/index";

export default paths({
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
			POST: stack([onError(() => respond({ status: 401 }))], () => {
				throw new Error("Another error");
			}),
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
		try {
			return wrap(ctx, req);
		} catch (e) {
			return customHandler(ctx, req);
		}
	};
}

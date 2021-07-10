import { paths, methods, stack, Routing } from "../src";

export default paths({
	"/one": () => "single",
	"/two": methods({
		GET: () => "GET /two",
		PUT: () => "PUT /two",
		POST: () => "POST /two",
		PATCH: () => "PATCH /two",
		DELETE: () => "DELETE /two",
	}),
	"/test": stack(
		[
			onError(() => ({ statusCode: 404 })),
			injectData(() => ({ user: "test user" })),
		],
		methods({
			GET: (ctx) => ctx.user,
			POST: stack([onError(() => ({ statusCode: 401 }))], () => {
				throw new Error("Another error");
			}),
			PATCH: () => "sick",
			DELETE: () => {
				throw new Error("Sample error");
			},
		})
	),
	"/nested": paths({
		"/test": () => "wew",
		"/second": paths({
			"/test": () => "wow",
		}),
	}),
	"/params/:wew": (ctx) => JSON.stringify(ctx[Routing].path.params),
	"/params_2/:first/:second": methods({
		POST: (ctx) => JSON.stringify(ctx[Routing].path.params),
	}),
});

function injectData<C, T>(injector: () => T) {
	return (wrap) => (ctx: C, req) => {
		return wrap(Object.assign({}, ctx, { ...injector() }), req);
	};
}

function onError<T>(customHandler) {
	return (wrap) => (ctx: T, req) => {
		try {
			return wrap(ctx, req);
		} catch (e) {
			return customHandler(ctx, req);
		}
	};
}

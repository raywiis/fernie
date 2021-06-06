import {
	paths,
	methods,
	respond,
	stack,
	MiddleWare,
	Context,
	ResponseGenerator,
} from "../src/index";

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
			onError(() => respond({ statusCode: 404 })),
			injectData(() => ({ user: "test user" })),
		],
		methods<Context & { user: string }>({
			GET: (ctx) => respond(ctx.user),
			POST: stack([onError(() => respond({ statusCode: 401 }))], () => {
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

function injectData<C, T>(injector: () => T): MiddleWare<C & T> {
	return (wrap: ResponseGenerator<C & T>) => (ctx: C, req) => {
		return wrap(Object.assign({}, ctx, { ...injector() }), req);
	};
}

function onError<T>(customHandler): MiddleWare<T> {
	return (wrap) => (ctx: T, req) => {
		try {
			return wrap(ctx, req);
		} catch (e) {
			return customHandler(ctx, req);
		}
	};
}

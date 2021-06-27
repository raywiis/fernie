import {
	paths,
	methods,
	stack,
	MiddleWare,
	Context,
	ResponseGenerator,
	RoutingContextSymbol,
} from "../src/index";

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
		methods<Context & { user: string }>({
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
	"/params/:wew": (ctx) =>
		JSON.stringify(ctx[RoutingContextSymbol].path.params),
	"/params_2/:first/:second": methods({
		POST: (ctx) => JSON.stringify(ctx[RoutingContextSymbol].path.params),
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

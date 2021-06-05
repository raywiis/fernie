import { IncomingMessage, ServerResponse } from "http";

type ResHandler = (req: IncomingMessage, res: ServerResponse) => void;

const PathNotFound = Symbol("No mathing path not found");

const RoutingContextSymbol = Symbol("Routing context");

interface IRoutingContext {
	path: {
		original: string;
		remainder: string;
	};
}

interface Context {
	[RoutingContextSymbol]: IRoutingContext;
}

export function makeHandler(handler: ResponseGenerator<Context>): ResHandler {
	return (req, res) => {
		const ctx: Context = {
			[RoutingContextSymbol]: {
				path: {
					original: req.url,
					remainder: req.url,
				},
			},
		};

		const resSpec = handler(ctx, req);
		if (resSpec === PathNotFound) {
			res.statusCode = 404;
			res.end();
			return;
		}

		if (typeof resSpec !== "object") {
			return;
		}

		res.statusCode = (resSpec as MResponse).status;
		// TODO: More complex responses
		res.end((resSpec as MResponse).body);
	};
}

type MiddleWare<T> = (parentFunc: ResponseGenerator<T>) => ResponseGenerator<T>;

interface PathSpec<T> {
	[path: string]: ResponseGenerator<T>;
}

export function stack<T>(
	middleware: [MiddleWare<T>],
	handler: ResponseGenerator<T>
): ResponseGenerator<T>;
export function stack<T, U>(
	middleware: [MiddleWare<T>, MiddleWare<U>],
	handler: ResponseGenerator<U>
): ResponseGenerator<U>;
export function stack(middleware, handler) {
	return middleware.reduceRight(
		(acc, curr) => curr(acc),
		handler
	) as ResponseGenerator<any>;
}

export function paths<T extends Context>(
	spec: PathSpec<T>
): ResponseGenerator<Context> {
	const entries = Object.entries(spec);
	return (ctx, req) => {
		const remainingPath = ctx[RoutingContextSymbol].path.remainder;
		for (const [path, handler] of entries) {
			if (!remainingPath.startsWith(path)) {
				continue;
			}
			const ctxUpdate = {
				...ctx,
				[RoutingContextSymbol]: {
					path: {
						original: ctx[RoutingContextSymbol].path.original,
						remainder: remainingPath.substring(path.length),
					},
				},
			} as T & Context;
			const result = handler(ctxUpdate, req);
			if (result === PathNotFound) {
				continue;
			}
			return result;
		}

		return PathNotFound;
	};
}

export function respond(a: string | { status?: number }): {
	status: number;
	body?: string;
} {
	if (typeof a === "string") {
		return { status: 200, body: a };
	} else if (typeof a === "object") {
		return {
			status: a.status || 200,
		};
	}
}

type MResponse = ReturnType<typeof respond>;

export type ResponseGenerator<T> = (
	ctx: Context & T,
	req: IncomingMessage
) => MResponse | Symbol;

type MethodSpecification<T> = {
	GET?: ResponseGenerator<T>;
	POST?: ResponseGenerator<T>;
	PUT?: ResponseGenerator<T>;
	PATCH?: ResponseGenerator<T>;
	DELETE?: ResponseGenerator<T>;
};

export function methods<T>(spec: MethodSpecification<T>): ResponseGenerator<T> {
	return (ctx, req) => {
		const responseMethod: ResponseGenerator<T> = spec[req.method];
		if (!responseMethod) {
			return PathNotFound;
		}
		return responseMethod(ctx, req);
	};
}

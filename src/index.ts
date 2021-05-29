import { IncomingMessage, ServerResponse } from "http";

type ResHandler = (req: IncomingMessage, res: ServerResponse) => void;

const PathNotFound = Symbol('No mathing path not found');

const RoutingContextSymbol = Symbol('Routing context');

interface IRoutingContext {
	path: {
		original: string;
		remainder: string;
	};
}

interface Context {
	[RoutingContextSymbol]: IRoutingContext
}

export function makeHandler(handler: ResponseGenerator): ResHandler {
	return (req, res) => {
		const ctx: Context = {
			[RoutingContextSymbol]: {
				path: {
					original: req.url,
					remainder: req.url
				}
			}
		}

		const resSpec = handler(ctx, req);
		if (resSpec === PathNotFound) {
			res.statusCode = 404;
			res.end();
			return;
		}

		// TODO: More complex responses
		res.end((resSpec as MResponse).body);
	}
}

type MiddleWare = (parentFunc: ResponseGenerator) => ResponseGenerator;
interface PathSpec {
	[path: string]: ResponseGenerator;
}

export function stack(middleware: MiddleWare[], handler: ResponseGenerator): ResponseGenerator {
	return middleware.reduceRight((acc, curr) => curr(acc), handler)
}

export function paths(spec: PathSpec): ResponseGenerator {
	const entries = Object.entries(spec);
	return (ctx, req) => {
		const remainingPath = ctx[RoutingContextSymbol].path.remainder;
		for (const [path, handler] of entries) {
			if (!remainingPath.startsWith(path)) {
				continue;
			}
			const ctxUpdate: Context = {
				...ctx,
				[RoutingContextSymbol]: {
					path: {
						original: ctx[RoutingContextSymbol].path.original,
						remainder: remainingPath.substring(path.length)
					}
				}
			}
			const result = handler(ctxUpdate, req);
			if (result === PathNotFound) {
				continue
			}
			return result;
		}

		return PathNotFound
	}
}

export function respond(a: string | { status?: number }): {
	status: number;
	body?: string;
} {
	if (typeof a === "string") {
		return { status: 200, body: a };
	} else if (typeof a === "object") {
		return {
			status: 200 || a.status,
		};
	}
}

type MResponse = ReturnType<typeof respond>;

export type ResponseGenerator = (ctx: Context, req: IncomingMessage) => MResponse | Symbol;

type MethodSpecification = {
	GET?: ResponseGenerator
	POST?: ResponseGenerator,
	PUT?: ResponseGenerator
	PATCH?: ResponseGenerator
	DELETE?: ResponseGenerator
}

export function methods(spec: MethodSpecification): ResponseGenerator {
	return (ctx, req) => {
		const responseMethod: ResponseGenerator = spec[req.method];
		if (!responseMethod) {
			return PathNotFound;
		}
		return responseMethod(ctx, req);
	};
}

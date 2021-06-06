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

export interface Context {
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

		res.statusCode = (resSpec as ResponseSpecification).statusCode;
		res.end((resSpec as ResponseSpecification).body);
	};
}

export type MiddleWare<T> = (
	parentFunc: ResponseGenerator<T>
) => ResponseGenerator<T>;

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

export function paths<T>(
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

interface ResponseSpecification {
	statusCode?: number;
	body?: string | Buffer;
}
const defaultResponse: Required<ResponseSpecification> = {
	statusCode: 200,
	body: "",
};

export function respond(
	a: string | ResponseSpecification
): Required<ResponseSpecification> {
	if (typeof a === "string") {
		return {
			...defaultResponse,
			body: a,
		};
	} else if (typeof a === "object") {
		return {
			...defaultResponse,
			...a,
		};
	}
}

export type ResponseGenerator<T> = (
	ctx: T,
	req: IncomingMessage
) => ResponseSpecification | Symbol;

type MethodSpecification<T> = {
	GET?: ResponseGenerator<T>;
	POST?: ResponseGenerator<T>;
	PUT?: ResponseGenerator<T>;
	PATCH?: ResponseGenerator<T>;
	DELETE?: ResponseGenerator<T>;
};

export function methods<T>(spec: MethodSpecification<T>): ResponseGenerator<T> {
	return (ctx: T, req) => {
		const responseMethod: ResponseGenerator<T> = spec[req.method];
		if (!responseMethod) {
			return PathNotFound;
		}
		return responseMethod(ctx, req);
	};
}

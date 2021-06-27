import { IncomingMessage, ServerResponse } from "http";
import { pathToRegexp } from "path-to-regexp";

type ResHandler = (req: IncomingMessage, res: ServerResponse) => void;

const PathNotFound = Symbol("No mathing path not found");

export const RoutingContextSymbol = Symbol("Routing context");

interface IRoutingContext {
	path: {
		original: string;
		remainder: string;
		params?: {
			[paramName: string]: any;
		};
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

		const rawRes = handler(ctx, req);
		if (rawRes === PathNotFound) {
			res.statusCode = 404;
			res.end();
			return;
		}

		const resSpec = respond(rawRes as RawResponse);
		res.statusCode = resSpec.statusCode;
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

function buildParams(match, keys) {
	return keys.reduce((acc, key, idx) => {
		acc[key.name] = match[idx + 1];
		return acc;
	}, {});
}

function makeFinder<T>(spec: PathSpec<T>) {
	const entries = Object.entries(spec);
	return (remainingPath: string) => {
		for (const [path, handler] of entries) {
			const keys = [];
			const regex = pathToRegexp(path, keys, {
				end: false,
			});
			const match = regex.exec(remainingPath);
			if (!match) {
				continue;
			}
			return {
				match,
				keys,
				handler,
			};
		}
		return null;
	};
}

export function paths<T>(spec: PathSpec<T>): ResponseGenerator<Context> {
	const findMatch = makeFinder(spec);
	return (ctx, req) => {
		const remainingPath = ctx[RoutingContextSymbol].path.remainder;
		const path = findMatch(remainingPath);
		if (!path) {
			return PathNotFound;
		}
		const { keys, match, handler } = path;
		if (!match) {
			return PathNotFound;
		}
		const pathUpdate = {
			original: ctx[RoutingContextSymbol].path.original,
			remainder: remainingPath.substring(match[0].length),
			params: match.length > 1 ? buildParams(match, keys) : undefined,
		};
		const ctxUpdate = {
			...ctx,
			[RoutingContextSymbol]: { path: pathUpdate },
		} as T & Context;
		const result = handler(ctxUpdate, req);
		return result;
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

export type RawResponse = string | ResponseSpecification;

export function respond(a: RawResponse): Required<ResponseSpecification> {
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
) => RawResponse | Symbol;

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

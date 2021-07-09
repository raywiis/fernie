import { IncomingMessage, RequestListener, ServerResponse } from "http";
import { pathToRegexp } from "path-to-regexp";

type ResponseBody = string;

interface ResponseObject {
	statusCode: number;
	body: ResponseBody;
}

type RoutableSpec = BranchSpec | RequestHandler;

enum BranchTypes {
	Path,
	Method,
	MiddleWare,
}

type BranchSpec = {
	type: BranchTypes;
	entries: {
		[key: string]: RoutableSpec;
	};
	middleware?: MiddleWare[];
};

export type Response = ResponseBody | ResponseObject;

export const Routing = Symbol("Fernie routing");

type Context = {
	[Routing]: {
		path: any;
	};
};

export type SyncRequestHandler = (
	context: Context,
	request: IncomingMessage
) => Response;
export type AsyncRequestHandler = () => Promise<Response>;

export type RequestHandler = SyncRequestHandler | AsyncRequestHandler;

function finalizeResponse(
	targetRes: ServerResponse,
	sourceRes: Response
): void {
	if (!sourceRes) {
		targetRes.statusCode = 404;
		targetRes.end();
	} else if (typeof sourceRes === "string") {
		targetRes.write(sourceRes);
		targetRes.end();
	} else if (typeof sourceRes === "object") {
		targetRes.statusCode = sourceRes.statusCode || 200;
		if (sourceRes.body) {
			targetRes.write(sourceRes.body);
		}
		targetRes.end();
	}
	throw new Error("Response finalizer not implemented");
}

type RoutingContext = {
	path: {
		remaining: string;
		params: {
			[name: string]: string;
		};
	};
};

function resolvePathBranch(
	paths,
	pathContext: RoutingContext
): [spec: RoutableSpec, ctxUpdate: RoutingContext] {
	const entries = Object.entries(paths);

	for (const [path, item] of entries) {
		const keys = [];
		const regex = pathToRegexp(path, keys, {
			end: false,
		});
		const match = regex.exec(pathContext.path.remaining);

		if (!match) {
			continue;
		}

		const paramUpdate =
			keys.length > 0
				? keys.reduce((acc, key, idx) => {
						acc[key.name] = match[idx + 1];
						return acc;
				  }, pathContext.path.params)
				: pathContext.path.params;

		const ctxUpdate = {
			...pathContext,
			path: {
				params: paramUpdate,
				remaining: pathContext.path.remaining.slice(match[0].length),
			},
		};

		return [item as any, ctxUpdate];
	}

	return [undefined, null];
}

export function makeHandler(spec: BranchSpec): RequestListener {
	return async (req, res) => {
		const context = {
			[Routing]: {
				path: {
					remaining: req.url,
					params: {},
				},
			},
		};

		let handler: RoutableSpec = spec;
		let middlewares = [];
		while (handler && typeof handler !== "function") {
			let resolution;
			let update = context[Routing];
			if (handler.type === BranchTypes.Method) {
				resolution = handler.entries[req.method];
			} else if (handler.type === BranchTypes.Path) {
				[resolution, update] = resolvePathBranch(
					handler.entries,
					context[Routing]
				);
			} else if (handler.type === BranchTypes.MiddleWare) {
				middlewares = [...middlewares, ...handler.middleware];
				resolution = handler.entries.thing;
			}

			if (resolution) {
				handler = resolution;
				context[Routing] = update;
			} else {
				handler = undefined;
			}
		}

		if (!handler) {
			finalizeResponse(res, undefined);
		}

		const middlewaredHandler: RequestHandler = middlewares.reduceRight(
			(acc, middleware) => {
				return middleware(acc);
			},
			handler
		);

		const result = await middlewaredHandler(context, req);
		finalizeResponse(res, result);
	};
}

type PathSpec = {
	[path: string]: RoutableSpec;
};

export function paths(entries: PathSpec): BranchSpec {
	return {
		type: BranchTypes.Path,
		entries,
	};
}

export function methods(entries): BranchSpec {
	return {
		type: BranchTypes.Method,
		entries,
	};
}

type MiddleWare = (wrap: RoutableSpec) => RoutableSpec;

export function stack(
	middleware: MiddleWare[],
	finalHandler: RoutableSpec
): BranchSpec {
	return {
		type: BranchTypes.MiddleWare,
		entries: {
			thing: finalHandler,
		},
		middleware,
	};
}

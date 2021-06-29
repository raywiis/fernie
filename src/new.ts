import { IncomingMessage, OutgoingMessage } from "http";

type ResponseBody = string;

interface ResponseObject {
	statusCode: number;
	body: ResponseBody;
}

type RoutableSpec = BranchSpec | RequestHandler;

type BranchSpec = {
	finder: (request: IncomingMessage) => RoutableSpec;
	entries: {
		[key: string]: RoutableSpec;
	};
};

export type Response = ResponseBody | ResponseObject;

type Context = {};

export type SyncRequestHandler = (
	context: Context,
	request: IncomingMessage
) => Response;
export type AsyncRequestHandler = () => Promise<Response>;

export type RequestHandler = SyncRequestHandler | AsyncRequestHandler;

type NodeRequestHandler = (
	request: IncomingMessage,
	response: OutgoingMessage
) => void;

export function makeHandler(spec: RoutableSpec): NodeRequestHandler {
	return (req, res) => {};
}

export const Routing = Symbol("Fernie routing");

export function paths(entries): BranchSpec {
	return {
		finder: (req) => {
			return () => "nope";
		},
		entries,
	};
}

export function methods(entries): BranchSpec {
	return {
		finder: (req) => entries[req.method],
		entries,
	};
}

type MiddleWare = (wrap: RoutableSpec) => RoutableSpec;

export function stack(middleware: MiddleWare[], finalHandler): BranchSpec {
	return {
		finder: (req) => {
			const handler = middleware.reduceRight(
				(acc, wrapper) => wrapper(acc),
				finalHandler
			);
			return (ctx, req) => handler(ctx, req);
		},
		entries: {},
	};
}

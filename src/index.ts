import { IncomingMessage, ServerResponse } from "http";

type ResHandler = (req: IncomingMessage, res: ServerResponse) => void;

const PathNotFound = Symbol('No mathing path not found');

export function makeHandler(handler: ResponseGenerator): ResHandler {
	return (req, res) => {
		const ctx = {}
		const resSpec = handler(ctx, req);
		if (typeof resSpec !== "symbol") {
			res.end((resSpec as MResponse).body);
		}
	}
}

type MiddleWare = (parentFunc: ResponseGenerator) => ResponseGenerator;
interface PathSpec {
	[path: string]: ResponseGenerator | [...MiddleWare[], ResponseGenerator];
}

export function paths(spec: PathSpec): ResponseGenerator {
	const entries = Object.entries(spec);
	return (ctx, req) => {
		const [_, handler] = entries.find(([path, h]) => {
			return req.url.startsWith(path);
		})

		if (!handler) {
			return PathNotFound;
		}

		// TODO: Update ctx to reduce path scope

		if (Array.isArray(handler)) {
			const final = handler.reduceRight(
				(acc: ResponseGenerator, middleware: MiddleWare) => middleware(acc)
			) as ResponseGenerator;
			return final(ctx, req);
		}

		return handler(ctx, req);
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

export type ResponseGenerator = (ctx, req: IncomingMessage) => MResponse | Symbol;


interface MethodSpecification {
	GET?: ResponseGenerator;
	POST?: ResponseGenerator;
	PUT?: ResponseGenerator;
	PATCH?: ResponseGenerator;
	DELETE?: ResponseGenerator;
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

import { IncomingMessage, ServerResponse } from "http";

type ResHandler = (req: IncomingMessage, res: ServerResponse) => void;

export function makeHandler(handler: ResponseGenerator): ResHandler {
	return (req, res) => {
		const ctx = {}
		const resSpec = handler(ctx, req);
		res.end(resSpec.body);
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
			return null;
		}

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

export type ResponseGenerator = (ctx, req: IncomingMessage) => MResponse | null;


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
		return responseMethod(ctx, req);
	};
}

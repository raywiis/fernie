import { IncomingMessage, ServerResponse } from "http";

interface MatchingContext {
	path: {
		remaining: string
	}
}


type MatchHandler = (ctx: MatchingContext, req: IncomingMessage, res: ServerResponse) => boolean

type RouteHandler = (req: IncomingMessage, res: ServerResponse) => ResponseSpecification
type ResponseSpecification = string | { status: number } | ((req: IncomingMessage, res: ServerResponse) => void);

type RouteSpecification = [MatchHandler, RouteHandler];

export function routes(routeSpec: RouteSpecification[]) {
	return function routeHandler(req: IncomingMessage, res: ServerResponse) {
		const matchingContext = { path: { remaining: '' } };
		const route = routeSpec.find(([matcher]) => matcher(matchingContext, req));

		if (!route) {
			throw new Error('No route for your thing: ' + req.url)
		}

		const [_, handler] = route;

		const resSpec = handler(Object.assign(req, {
			url: '/' + req.url.split('/').slice(2).join('/')
		}), res);

		if (resSpec && typeof resSpec === "object" && !(resSpec instanceof Buffer)) {
			res.statusCode = resSpec.status;
			res.end();
		} else {
			res.end(resSpec);
		}
	};
}

export function makeHandler(RouteHandler): void {
	
}

type PathSpecification = [MatchHandler, RouteHandler];

export function paths(pathSpecs: PathSpecification[]): RouteHandler {
	return function pathHandler(ctx, req, res) {
		const [matcher, handler] = pathSpecs.find(([matcher]) => matcher(ctx, req, res));

		return handler(req, res);
	}
}

export function path(path: string) {
	return (ctx: MatchingContext, req: IncomingMessage) => {
		return req.url.startsWith(path);
	};
}

function pathAndMethod(url: string, method: string) {
	const m1 = path(url);
	return (ctx: MatchingContext, req: IncomingMessage) => {
		return m1(ctx, req) && req.method === method
	};
}

function get(url: string) {
	return pathAndMethod(url, "GET")
}

function post(url: string) {
	return pathAndMethod(url, "POST");
}

function put(url: string) {
	return pathAndMethod(url, "PUT");
}

function patch(url: string)

function del(url: string) {
	return pathAndMethod(url, "DELETE");
}

function method(method, handlers) {
}

export const methods = {
	get,
	post,
	put,
	del,
	method
};

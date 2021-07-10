import { ServerResponse } from "http";
import { Response, ResponseBody } from "./response";

export default function finalizeResponse(
	targetRes: ServerResponse,
	sourceRes: Response
): void {
	if (!sourceRes) {
		targetRes.statusCode = 404;
		targetRes.end();
		return;
	} else if (typeof sourceRes === "string") {
		writeBody(targetRes, sourceRes);
		targetRes.end();
		return;
	} else if (typeof sourceRes === "object") {
		targetRes.statusCode = sourceRes.statusCode || 200;
		if (sourceRes.body) {
			writeBody(targetRes, sourceRes.body);
		}
		targetRes.end();
		return;
	}
	throw new Error("Response finalizer not implemented");
}

function writeBody(targetRes: ServerResponse, body: ResponseBody): void {
	targetRes.write(body);
}

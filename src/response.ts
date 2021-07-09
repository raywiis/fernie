export type Response = ResponseBody | ResponseObject;

type ResponseObject = {
	statusCode: number;
	body: ResponseBody;
};

export type ResponseBody = string;

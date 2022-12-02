import * as https from "node:https";

class HttpError extends Error {
	status: number | null;
	constructor(message: string, status?: number) {
		super(message);
		this.status = status ?? null;
	}
}

function httpsGet(url: string) {
	const urlObj = new URL(url);
	return new Promise<string>((resolve, reject) => {
		const req = https.request(urlObj, (res) => {
			if (res.statusCode !== 200) reject(new HttpError(`Non-200 status code: ${res.statusCode}`, res.statusCode));
			let data = "";
			res.on("data", (chunk) => {
				data += chunk;
			});
			res.on("end", () => {
				resolve(data);
			});
		});
		req.on("error", (err) => {
			reject(err);
		});
		req.end();
	});
}

export { httpsGet, HttpError }

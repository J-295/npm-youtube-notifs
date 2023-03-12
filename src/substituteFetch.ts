import * as https from "node:https";

type SubstituteFetchResponse = {
	status: number;
	ok: boolean;
	text: () => Promise<string>;
}

// Used if fetch is not available
function substituteFetch(url: string, init: any): Promise<SubstituteFetchResponse> {
	return new Promise((resolve, reject) => {

		const req = https.request(new URL(url), (res) => {
			let txt = "";
			res.on("data", (chunk) => {
				txt += chunk;
			});
			res.on("end", () => {
				if (res.statusCode === undefined) return reject(new Error("statusCode is undefined"));
				resolve({
					status: res.statusCode,
					ok: 200 <= res.statusCode && res.statusCode <= 299,
					text: () => new Promise<string>((resolve) => resolve(txt))
				});
			});
		});
		req.on("error", (err) => {
			reject(err);
		});
		req.end();

	});
}

export { substituteFetch }

import * as https from "node:https";

export default function (url: string) {
	const urlObj = new URL(url);
	return new Promise<string>((resolve, reject) => {
		const req = https.request(urlObj, (res) => {
			if (res.statusCode !== 200) reject(new Error(`Non-200 status code: ${res.statusCode}`));
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

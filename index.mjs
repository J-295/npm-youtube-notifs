import EventEmitter from "node:events";
import fs from "node:fs";
import https from "node:https";
import { parseString as parseXml } from "xml2js";
import writeFile from "@james-bennett-295/writefile";
import keyValPairs from "key-value-pairs";

const dataFileNamePattern = /^(([a-zA-Z0-9_\-]*|\.{0,2})\/)*[a-zA-Z0-9_\-]+\.json$/;
const dbTablePrefixPattern = /^[a-zA-Z0-9_]+$/;
const channelIdPattern = /^[a-zA-Z0-9_\-]{24}$/;

class Notifier extends EventEmitter {

	constructor(dataStorageLocation, newVidCheckInterval) {
		super();

		this.valid = false;
		this.enabled = false;
		this.subscriptions = [];

		if (typeof dataStorageLocation === "undefined") {
			dataStorageLocation = "./yt-notifs-data.json"
		} else if (
			typeof dataStorageLocation === "string" &&
			!dataFileNamePattern.test(dataStorageLocation)
		) {
			const error = new Error("Invalid dataStorageLocation filename provided");
			this.emit("error", error);
			return;
		} else if (
			typeof dataStorageLocation === "object" && (
				typeof dataStorageLocation.database !== "object" ||
				typeof dataStorageLocation.tablePrefix !== "string" ||
				!dbTablePrefixPattern.test(dataStorageLocation.tablePrefix)
			)) {
			const error = new Error("Invalid dataStorageLocation database info provided");
			this.emit("error", error);
			return;
		}
		if (typeof newVidCheckInterval === "undefined") {
			newVidCheckInterval = 120;
		} else if (!(
			typeof newVidCheckInterval === "number" &&
			newVidCheckInterval >= 15
		)) {
			const error = new Error("Invalid newVidCheckInterval provided");
			this.emit("error", error);
			return;
		}
		this.valid = true;

		this.dataStorageLocation = dataStorageLocation;
		this.newVidCheckInterval = newVidCheckInterval * 1000;
	}

	#notifier() {

		let saveData = false;
		this.checkIntervalId = setInterval(() => {
			for (let i = 0; i < this.subscriptions.length; i++) {

				const channelId = this.subscriptions[i];

				const req = https.request({
					hostname: "www.youtube.com",
					port: 443,
					path: "/feeds/videos.xml?channel_id=" + channelId,
					method: "GET"
				}, (res) => {

					if (res.statusCode === 404) {
						this.unsubscribe(channelId);
						const error = new Error("Channel \"" + channelId + "\" does not exist so has been unsubscribed from");
						this.emit("error", error);
						return;

					} else if (res.statusCode !== 200) {
						const error = new Error("Got status code " + res.statusCode + " when checking for new videos on channel \"" + channelId + "\"");
						this.emit("error", error);
						return;
					}

					let xml = "";
					res.on("data", (chunk) => {
						xml += chunk;
					});
					res.on("end", () => {
						parseXml(xml, (err, channelData) => {
							if (err !== null) return this.emit("error", err);

							if (channelData.feed.entry.length === 0) return;
							if (typeof this.data.latestVids[channelId] === "undefined") {
								this.data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
								saveData = true;
								return;
							}
							const allVidIds = channelData.feed.entry.map(vid => vid["yt:videoId"][0]);
							if (!allVidIds.includes(this.data.latestVids[channelId])) {
								this.data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
								saveData = true;
								return;
							};

							let newVids = [];
							for (let i = 0; i < channelData.feed.entry.length; i++) {
								if (channelData.feed.entry[i]["yt:videoId"][0] === this.data.latestVids[channelId]) break;
								const vidObj = {
									vid: {
										name: channelData.feed.entry[i].title[0],
										description: channelData.feed.entry[i]["media:group"][0]["media:description"][0],
										url: channelData.feed.entry[i].link[0].$.href,
										id: channelData.feed.entry[i]["yt:videoId"][0],
										width: parseInt(channelData.feed.entry[i]["media:group"][0]["media:content"][0].$.width),
										height: parseInt(channelData.feed.entry[i]["media:group"][0]["media:content"][0].$.height),
										thumbnail: {
											url: channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.url,
											width: parseInt(channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.width),
											height: parseInt(channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.height)
										}
									},
									channel: {
										name: channelData.feed.title[0],
										url: channelData.feed.entry[i].author[0].uri[0],
										id: channelData.feed["yt:channelId"][0]
									}
								};
								newVids.push(vidObj);
							};

							if (newVids.length === 0) return;

							saveData = true;

							newVids = newVids.reverse();
							for (let j = 0; j < newVids.length; j++) {
								this.emit("newVid", newVids[j]);
							}
							this.data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
						});
					});
				});

				req.on("error", (err) => {
					this.emit("error", err);
				});

				req.end();
			}
			if (saveData) {
				saveData = false;
				if (typeof this.dataStorageLocation === "string") {
					writeFile(this.dataStorageLocation, JSON.stringify(this.data));
				} else {
					const latestVidKeys = Object.keys(this.data.latestVids);
					for (let i = 0; i < latestVidKeys.length; i++) {
						keyValPairs.set(latestVidKeys[i], this.data.latestVids[latestVidKeys[i]], this.dataStorageLocation.tablePrefix + "_latest_vids", this.dataStorageLocation.database);
					}
				}
			}
		}, this.newVidCheckInterval);
	}

	start() {

		if (this.enabled) {
			const error = new Error("An attempt was made to start the notifier while it is already enabled");
			this.emit("error", error);
		}
		if (!this.valid) {
			const error = new Error("An attempt was made to start the notifier but the notifier is invalid");
			this.emit("error", error);
		}

		this.enabled = true;

		if (typeof this.dataStorageLocation === "string") {
			fs.stat(this.dataStorageLocation, (err, stat) => {
				if (err === null) {
					fs.readFile(this.dataStorageLocation, "utf8", (err, json) => {
						if (err !== null) return this.emit("error", err);
						this.data = JSON.parse(json);
						this.#notifier();
					});
				} else if (err.code === "ENOENT") {
					this.data = {
						latestVids: {}
					}
					this.#notifier();
				} else {
					this.emit("error", err);
				}
			});
		} else {
			this.dataStorageLocation.database.all(`
				SELECT * from ${this.dataStorageLocation.tablePrefix}_latest_vids;
			`, (err, rows) => {
				if (err !== null) {
					if (err.errno === 1) { // Most likely going to be the table doesn't exist
						this.data = {
							latestVids: {}
						}
						return this.#notifier();
					} else {
						return this.emit("error", err);
					}
				}
				this.data = {
					latestVids: {}
				}
				for (let i = 0; i < rows.length; i++) {
					this.data.latestVids[rows[i].key] = rows[i].val;
				}
				this.#notifier();
			})
		}

	}

	stop() {
		if (!this.enabled) {
			const error = new Error("The stop function was ran while the notifier was disabled");
			this.emit("error", error);
			return;
		}
		this.enabled = false;
		clearInterval(this.checkIntervalId);
	}

	subscribe(channelIds) {
		if (typeof channelIds === "string") {
			if (!channelIdPattern.test(channelIds)) {
				const error = new Error("Invalid channel ID passed into subscribe function: " + channelIds);
				return this.emit("error", error);
			}
			if (this.subscriptions.includes(channelIds)) {
				const error = new Error("An attempt was made to subscribe to an already subscribed to channel: " + channelIds);
				return this.emit("error", error);
			}
			this.subscriptions.push(channelIds);

		} else if (Array.isArray(channelIds)) {
			for (let i = 0; i < channelIds.length; i++) {
				if (!channelIdPattern.test(channelIds[i])) {
					const error = new Error("Invalid channel ID passed into subscribe function: " + channelIds[i]);
					return this.emit("error", error);
				}
				if (this.subscriptions.includes(channelIds[i])) {
					const error = new Error("An attempt was made to subscribe to an already subscribed to channel: " + channelIds[i]);
					return this.emit("error", error);
				}
				this.subscriptions.push(channelIds[i]);
			}

		} else {
			const error = new Error("Invalid datatype passed into subscribe function: " + typeof channelIds);
			this.emit("error", error);
		}
	}

	unsubscribe(channelIds) {
		if (typeof channelIds === "string") {
			if (!channelIdPattern.test(channelIds)) {
				const error = new Error("Invalid channel ID passed into unsubscribe function: " + channelIds);
				return this.emit("error", error);
			}
			if (!this.subscriptions.includes(channelIds)) {
				const error = new Error("An attempt was made to unsubscribe from a channel which was not subscribed to: " + channelIds);
				return this.emit("error", error);
			}
			this.subscriptions.splice(this.subscriptions.indexOf(channelIds), 1);

		} else if (Array.isArray(channelIds)) {
			for (let i = 0; i < channelIds.length; i++) {
				if (!channelIdPattern.test(channelIds[i])) {
					const error = new Error("Invalid channel ID passed into unsubscribe function: " + channelIds[i]);
					return this.emit("error", error);
				}
				if (!this.subscriptions.includes(channelIds)) {
					const error = new Error("An attempt was made to unsubscribe from a channel which was not subscribed to: " + channelIds[i]);
					return this.emit("error", error);
				}
				this.subscriptions.splice(this.subscriptions.indexOf(channelIds[i]), 1);
			}

		} else {
			const error = new Error("Invalid datatype passed into subscribe function: " + typeof channelIds);
			this.emit("error", error);
		}
	}

}

function msg(txt, obj) {
	if (typeof txt !== "string") {
		const error = new Error("Invalid datatype passed into txt arg of msg function: " + typeof txt);
		this.emit("error", error);
		return;
	}
	if (!(
		typeof obj !== "undefined" &&
		Object.prototype.toString.call(obj) === "[object Object]" &&
		Object.prototype.toString.call(obj.vid) === "[object Object]" &&
		Object.prototype.toString.call(obj.vid.thumbnail) === "[object Object]" &&
		Object.prototype.toString.call(obj.channel) === "[object Object]"
	)) {
		const error = new Error("Invalid video object passed into obj arg of msg function");
		this.emit("error", error);
		return;
	}
	return txt
		.replaceAll("{vidName}", obj.vid.name)
		.replaceAll("{vidUrl}", obj.vid.url)
		.replaceAll("{vidDescription}", obj.vid.description)
		.replaceAll("{vidId}", obj.vid.id)
		.replaceAll("{vidWidth}", obj.vid.width)
		.replaceAll("{vidHeight}", obj.vid.height)
		.replaceAll("{vidThumbnailUrl}", obj.vid.thumbnail.url)
		.replaceAll("{vidThumbnailWidth}", obj.vid.thumbnail.width)
		.replaceAll("{vidThumbnailHeight}", obj.vid.thumbnail.height)
		.replaceAll("{channelName}", obj.channel.name)
		.replaceAll("{channelUrl}", obj.channel.url)
		.replaceAll("{channelId}", obj.channel.id);
}

export default {
	Notifier,
	msg
}

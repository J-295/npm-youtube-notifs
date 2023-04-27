import xml2js from "xml2js";
import { substituteFetch } from "./substituteFetch";

if (typeof fetch === "undefined") {
	console.log("[youtube-notifs package]: Using fetch substitute. Update Node.js to a version containing fetch to remove this message.");
}

const nfetch = (typeof fetch === "undefined") ? substituteFetch : fetch;

type Channel = {
	title: string,
	url: string,
	id: string,
	released: Date,
	videos: Video[]
}

type Video = {
	title: string,
	url: string,
	id: string,
	released: Date,
	description: string,
	width: number,
	height: number,
	thumb: {
		width: number,
		height: number,
		url: string
	},
	channel: Omit<Channel, "videos">
}

function getChannelData(channelId: string) {
	return new Promise<Channel | null>((resolve, reject) => {

		nfetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
			cache: "no-cache"
		})
			.then((res) => {
				if (res.status === 404) return resolve(null);
				if (!res.ok) reject(new Error(`Result not ok. Status: ${res.status}`));
				res.text()
					.then((xml) => {
						xml2js.parseString(xml, (err, data) => {
							if (err !== null) reject(err);

							let channel: Channel = {
								title: data.feed.title[0],
								url: data.feed.link[1].$.href,
								id: channelId,
								released: new Date(data.feed.published[0]),
								videos: []
							}

							if (data.feed.entry === undefined) return resolve(channel);

							for (let i = 0; i < data.feed.entry.length; i++) {
								const entry = data.feed.entry[i];
								channel.videos.push({
									title: entry.title[0],
									url: entry.link[0].$.href,
									id: entry["yt:videoId"][0],
									released: new Date(entry.published[0]),
									description: entry["media:group"][0]["media:description"][0],
									width: parseInt(entry["media:group"][0]["media:content"][0].$.width),
									height: parseInt(entry["media:group"][0]["media:content"][0].$.height),
									thumb: {
										width: parseInt(entry["media:group"][0]["media:thumbnail"][0].$.width),
										height: parseInt(entry["media:group"][0]["media:thumbnail"][0].$.height),
										url: entry["media:group"][0]["media:thumbnail"][0].$.url
									},
									channel: {
										title: channel.title,
										url: channel.title,
										id: channel.id,
										released: channel.released
									}
								});
							}

							resolve(channel);

						});
					});
			});

	});
}

export { getChannelData, Video }

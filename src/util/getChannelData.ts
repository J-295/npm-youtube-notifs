import get from "./httpsGet";
import xml2js from "xml2js";

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
	channel: {
		title: string,
		url: string,
		id: string,
		released: Date
	}
}

type Channel = {
	title: string,
	url: string,
	id: string,
	released: Date,
	videos: Array<Video>
}

export default function(channelId: string) {
	return new Promise<Channel>((resolve, reject) => {
		get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
			.then((xml) => {
				xml2js.parseString(xml, (err, parsedXml) => {
					if (err !== null) reject(err);
					let channel: Channel = {
						title: parsedXml.feed.title[0],
						url: parsedXml.feed.link[1].$.href,
						id: parsedXml.feed["yt:channelId"][0],
						released: new Date(parsedXml.feed.published[0]),
						videos: []
					}
					if (parsedXml.feed.entry === undefined) return resolve(channel);
					for (let i = 0; i < parsedXml.feed.entry.length; i++) {
						const entry = parsedXml.feed.entry[i];
						let vid: Video = {
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
							channel: { // TODO: try make circular excluding 'videos' property
								title: channel.title,
								url: channel.title,
								id: channel.id,
								released: channel.released
							}
						};
						channel.videos.push(vid);
					}
					resolve(channel);
				});
			})
			.catch((err) => {
				reject(err);
			});
	});
}

import { parseStringPromise as parseXml } from "xml2js";

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

async function getChannelData(channelId: string): Promise<Channel | null> {

	const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
		cache: "no-cache"
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`Result not ok. Status: ${res.status}`);
	const xml = await res.text();
	const data = await parseXml(xml);

	let channel: Channel = {
		title: data.feed.title[0],
		url: data.feed.link[1].$.href,
		id: channelId,
		released: new Date(data.feed.published[0]),
		videos: []
	}

	if (data.feed.entry === undefined) return channel;

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
				url: channel.url,
				id: channel.id,
				released: channel.released
			}
		});
	}

	return channel;

}

export { getChannelData, Video }

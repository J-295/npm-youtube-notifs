import { parseStringPromise as parseXml } from "xml2js";

type Channel = {
    name: string;
    url: string;
    id: string;
    created: Date;
    videos: Video[];
}

type Video = {
    title: string;
    url: string;
    id: string;
    created: Date;
    description: string;
    width: number;
    height: number;
    channel: {
        name: string;
        url: string;
        id: string;
        created: Date;
    };
    thumb: {
        width: number;
        height: number;
        url: string;
    };
}

async function getChannelData(channelId: string): Promise<Channel | null> {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
        cache: "no-cache"
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Result not ok. Status: ${res.status}`);
    const xml = await res.text();
    const data = await parseXml(xml);

    const channel: Channel = {
        name: String(data.feed.title[0]),
        url: String(data.feed.link[1].$.href),
        id: channelId,
        created: new Date(String(data.feed.published[0])),
        videos: []
    };

    if (data.feed.entry === undefined) return channel;

    for (const entry of data.feed.entry) {
        channel.videos.push({
            title: String(entry.title[0]),
            url: String(entry.link[0].$.href),
            id: String(entry["yt:videoId"][0]),
            created: new Date(String(entry.published[0])),
            description: String(entry["media:group"][0]["media:description"][0]),
            width: parseInt(String(entry["media:group"][0]["media:content"][0].$.width)),
            height: parseInt(String(entry["media:group"][0]["media:content"][0].$.height)),
            thumb: {
                width: parseInt(String(entry["media:group"][0]["media:thumbnail"][0].$.width)),
                height: parseInt(String(entry["media:group"][0]["media:thumbnail"][0].$.height)),
                url: String(entry["media:group"][0]["media:thumbnail"][0].$.url)
            },
            channel: {
                name: channel.name,
                url: channel.url,
                id: channel.id,
                created: channel.created
            }
        });
    }

    return channel;
}

export { getChannelData, Video };

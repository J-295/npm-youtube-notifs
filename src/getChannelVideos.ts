import { parseStringPromise as parseXml } from "xml2js";

export type Video = {
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
        url: string;
        width: number;
        height: number;
    };
}

export async function getChannelVideos(channelId: string): Promise<Video[] | null> {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const res = await fetch(url, {
        cache: "no-cache"
    });
    if (res.status === 404) return null;
    if (res.status !== 200) throw new Error(`Unexpected HTTP status ${res.status} from ${url}`);
    const xml = await res.text();
    const data = await parseXml(xml);

    const videos: Video[] = [];
    if (data.feed.entry === undefined) return videos;
    for (const entry of data.feed.entry) {
        videos.push({
            title: String(entry.title[0]),
            url: String(entry.link[0].$.href),
            id: String(entry["yt:videoId"][0]),
            created: new Date(String(entry.published[0])),
            description: String(entry["media:group"][0]["media:description"][0]),
            width: parseInt(String(entry["media:group"][0]["media:content"][0].$.width)),
            height: parseInt(String(entry["media:group"][0]["media:content"][0].$.height)),
            channel: {
                name: String(data.feed.title[0]),
                url: String(data.feed.link[1].$.href),
                id: channelId,
                created: new Date(String(data.feed.published[0]))
            },
            thumb: {
                url: String(entry["media:group"][0]["media:thumbnail"][0].$.url),
                width: parseInt(String(entry["media:group"][0]["media:thumbnail"][0].$.width)),
                height: parseInt(String(entry["media:group"][0]["media:thumbnail"][0].$.height)),
            }
        });
    }
    return videos;
}

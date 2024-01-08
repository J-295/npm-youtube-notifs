"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChannelData = void 0;
const xml2js_1 = require("xml2js");
function getChannelData(channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
            cache: "no-cache"
        });
        if (res.status === 404)
            return null;
        if (!res.ok)
            throw new Error(`Result not ok. Status: ${res.status}`);
        const xml = yield res.text();
        const data = yield (0, xml2js_1.parseStringPromise)(xml);
        const channel = {
            name: data.feed.title[0],
            url: data.feed.link[1].$.href,
            id: channelId,
            created: new Date(data.feed.published[0]),
            videos: []
        };
        if (data.feed.entry === undefined)
            return channel;
        for (const entry of data.feed.entry) {
            channel.videos.push({
                title: entry.title[0],
                url: entry.link[0].$.href,
                id: entry["yt:videoId"][0],
                created: new Date(entry.published[0]),
                description: entry["media:group"][0]["media:description"][0],
                width: parseInt(entry["media:group"][0]["media:content"][0].$.width),
                height: parseInt(entry["media:group"][0]["media:content"][0].$.height),
                thumb: {
                    width: parseInt(entry["media:group"][0]["media:thumbnail"][0].$.width),
                    height: parseInt(entry["media:group"][0]["media:thumbnail"][0].$.height),
                    url: entry["media:group"][0]["media:thumbnail"][0].$.url
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
    });
}
exports.getChannelData = getChannelData;

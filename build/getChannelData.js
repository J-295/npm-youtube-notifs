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
const substituteFetch_1 = require("./substituteFetch");
if (typeof fetch !== "function") {
    console.log("[youtube-notifs package]: Using fetch substitute. Update Node.js to a version containing fetch to remove this message.");
}
const fetchImpl = (typeof fetch === "function") ? fetch : substituteFetch_1.substituteFetch;
function getChannelData(channelId) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetchImpl(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
            cache: "no-cache"
        });
        if (res.status === 404)
            return null;
        if (!res.ok)
            throw new Error(`Result not ok. Status: ${res.status}`);
        const xml = yield res.text();
        const data = yield (0, xml2js_1.parseStringPromise)(xml);
        let channel = {
            title: data.feed.title[0],
            url: data.feed.link[1].$.href,
            id: channelId,
            released: new Date(data.feed.published[0]),
            videos: []
        };
        if (data.feed.entry === undefined)
            return channel;
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
        return channel;
    });
}
exports.getChannelData = getChannelData;

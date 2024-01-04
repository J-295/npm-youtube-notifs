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
exports.PollingNotifier = void 0;
const storage_1 = require("./storage");
const getChannelData_1 = require("./getChannelData");
const channelIdPattern = /^[0-9a-zA-Z_-]{24}$/;
class PollingNotifier {
    constructor(config) {
        this.subscriptions = [];
        this.intervalId = null;
        this.onError = null;
        this.onNewVideos = null;
        if (config.interval <= 0)
            throw new Error("interval cannot be zero or less");
        this.checkInterval = config.interval * 60 * 1000;
        this.storage = config.storage;
    }
    emitError(err) {
        if (this.onError === null) {
            throw err;
        }
        else {
            this.onError(err);
        }
    }
    doChecks() {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.storage.get(storage_1.Store.LatestVidIds, this.subscriptions);
            for (const channelId of this.subscriptions) {
                try {
                    const channel = yield (0, getChannelData_1.getChannelData)(channelId);
                    if (channel === null) {
                        this.unsubscribe([channelId]);
                        throw new Error(`Unsubscribing from channel as not exists: "${channelId}"`);
                    }
                    const prevLatestVidId = data[channel.id];
                    if (channel.videos.length === 0) {
                        data[channel.id] = "";
                        continue;
                    }
                    if (prevLatestVidId === null) {
                        data[channel.id] = channel.videos[0].id;
                        continue;
                    }
                    const vidIds = channel.videos.map((v) => v.id);
                    if (prevLatestVidId !== "" && !vidIds.includes(prevLatestVidId)) {
                        data[channel.id] = channel.videos[0].id;
                        continue;
                    }
                    const newVids = [];
                    for (const video of channel.videos) {
                        if (video.id === prevLatestVidId) {
                            break;
                        }
                        newVids.push(video);
                    }
                    if (newVids.length === 0) {
                        continue;
                    }
                    if (this.onNewVideos !== null)
                        this.onNewVideos(newVids.reverse());
                    data[channel.id] = channel.videos[0].id;
                }
                catch (err) {
                    this.emitError(err);
                }
            }
            this.storage.set(storage_1.Store.LatestVidIds, data);
        });
    }
    isActive() {
        return this.intervalId !== null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isActive()) {
                this.emitError(new Error("start() was ran while the notifier was active."));
                return;
            }
            yield this.doChecks();
            this.intervalId = setInterval(this.doChecks, this.checkInterval);
        });
    }
    stop() {
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier was not active."));
            return;
        }
        if (this.intervalId === null)
            return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
    subscribe(channels) {
        for (const channel of channels) {
            if (!channelIdPattern.test(channel)) {
                this.emitError(new Error(`Invalid channel ID inputted: ${JSON.stringify(channel)}`));
                return;
            }
            if (this.subscriptions.includes(channel)) {
                this.emitError(new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
                return;
            }
            this.subscriptions.push(channel);
        }
    }
    unsubscribe(channels) {
        for (const channel of channels) {
            const index = this.subscriptions.indexOf(channel);
            if (index === -1) {
                this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${JSON.stringify(channel)}`));
                return;
            }
            this.subscriptions.splice(index, 1);
        }
    }
    simulateNewVideo(properties) {
        const vid = {
            title: "Video Title",
            url: "https://www.youtube.com/watch?v=XxXxXxXxXxX",
            id: "XxXxXxXxXxX",
            released: new Date(),
            description: "Video Description",
            width: 640,
            height: 390,
            thumb: {
                width: 480,
                height: 360,
                url: "https://iX.ytimg.com/vi/XxXxXxXxXxX/hqdefault.jpg"
            },
            channel: {
                title: "Channel Title",
                url: "https://www.youtube.com/channel/XXXXXXXXXXXXXXXXXXXXXXXX",
                id: "XXXXXXXXXXXXXXXXXXXXXXXX",
                released: new Date()
            }
        };
        Object.assign(vid, properties);
        if (this.onNewVideos !== null)
            this.onNewVideos([vid]);
    }
}
exports.PollingNotifier = PollingNotifier;

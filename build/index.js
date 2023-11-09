"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.SubscriptionMethods = exports.DataStorageMethods = exports.Notifier = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const getChannelData_1 = require("./getChannelData");
const channelIdPattern = /^[0-9a-zA-Z_\-]{24}$/;
var DataStorageMethods;
(function (DataStorageMethods) {
    DataStorageMethods[DataStorageMethods["File"] = 0] = "File";
    DataStorageMethods[DataStorageMethods["None"] = 1] = "None";
})(DataStorageMethods || (exports.DataStorageMethods = DataStorageMethods = {}));
var SubscriptionMethods;
(function (SubscriptionMethods) {
    SubscriptionMethods[SubscriptionMethods["Polling"] = 0] = "Polling";
})(SubscriptionMethods || (exports.SubscriptionMethods = SubscriptionMethods = {}));
class Notifier {
    constructor(config) {
        this.subscriptions = [];
        this.dataFile = null;
        this.intervalId = null;
        this.data = {
            latestVids: {}
        };
        this.onError = null;
        this.onDebug = null;
        this.onNewVideo = null;
        this.onNewVideos = null;
        this.doChecks = () => __awaiter(this, void 0, void 0, function* () {
            this.emitDebug(`\n## DOING CHECKS ##`);
            for (const channelId of this.subscriptions) {
                try {
                    this.emitDebug(`checking channel ${channelId}`);
                    const channel = yield (0, getChannelData_1.getChannelData)(channelId);
                    if (channel === null) {
                        this.emitError(new Error(`Unsubscribing from channel as not exists: "${channelId}"`));
                        this._unsubscribe(channelId);
                        continue;
                    }
                    const prevLatestVidId = this.data.latestVids[channel.id];
                    this.emitDebug(`[${channel.id}] prevLatestVidId: ${prevLatestVidId}`);
                    this.emitDebug(`[${channel.id}] vid count: ${channel.videos.length}`);
                    if (channel.videos.length === 0) {
                        this.data.latestVids[channel.id] = null;
                        continue;
                    }
                    if (prevLatestVidId === undefined) {
                        this.emitDebug(`[${channel.id}] setting (first) latest vid to ${channel.videos[0].id}`);
                        this.data.latestVids[channel.id] = channel.videos[0].id;
                        continue;
                    }
                    const vidIds = channel.videos.map(v => v.id);
                    this.emitDebug(`[${channel.id}] vidIds: ${JSON.stringify(vidIds, null, 2)}`);
                    if (prevLatestVidId !== null) {
                        if (vidIds.includes(prevLatestVidId)) {
                            this.emitDebug(`[${channel.id}] vidIds includes prevLatestVidId`);
                        }
                        else {
                            this.emitDebug(`[${channel.id}] vidIds not includes prevLatestVidId`);
                            this.data.latestVids[channel.id] = channel.videos[0].id;
                            continue;
                        }
                    }
                    let newVids = [];
                    for (const video of channel.videos) {
                        if (video.id === prevLatestVidId) {
                            this.emitDebug(`[${channel.id}] reached prevLatestVidId`);
                            break;
                        }
                        newVids.push(video);
                        this.emitDebug(`[${channel.id}] pushed vid ${video.id} into newVids`);
                    }
                    if (newVids.length === 0) {
                        this.emitDebug(`[${channel.id}] no new vids`);
                        continue;
                    }
                    for (const vid of newVids) {
                        if (this.onNewVideo !== null)
                            this.onNewVideo(vid);
                        this.emitDebug(`[${channel.id}] emitted newVid for ${vid.id}`);
                    }
                    if (this.onNewVideos !== null)
                        this.onNewVideos(newVids.reverse());
                    this.emitDebug(`[${channel.id}] setting latest vid to ${channel.videos[0].id}`);
                    this.data.latestVids[channel.id] = channel.videos[0].id;
                }
                catch (err) {
                    this.emitError(err);
                }
            }
            this.saveData();
            this.emitDebug(`## CHECKS COMPLETE ##\n`);
        });
        this.start = () => __awaiter(this, void 0, void 0, function* () {
            this.emitDebug(`start() called`);
            if (this.isActive()) {
                this.emitError(new Error("start() was ran while the notifier was active."));
                return;
            }
            if (this.checkInterval <= 0) {
                this.emitError(new Error("checkInterval cannot be less than or equal to zero."));
                return;
            }
            this.emitDebug(`checkInterval is ${this.checkInterval}ms, dataFile is "${this.dataFile}"`);
            yield this.getData();
            yield this.doChecks();
            this.intervalId = setInterval(this.doChecks, this.checkInterval);
        });
        this.checkInterval = config.subscription.interval * 60 * 1000;
        this.dataFile = (config.dataStorage.file === undefined) ? null : path.resolve(config.dataStorage.file);
    }
    emitError(err) {
        if (this.onError === null) {
            throw err;
        }
        else {
            this.onError(err);
        }
    }
    emitDebug(log) {
        if (this.onDebug !== null)
            this.onDebug(log);
    }
    getData() {
        return new Promise((resolve) => {
            if (this.dataFile === null) {
                this.emitDebug(`not getting data as dataFile is null`);
                return resolve();
            }
            if (!fs.existsSync(this.dataFile)) {
                this.emitDebug(`data file not exists`);
                return resolve();
            }
            this.emitDebug(`reading data file...`);
            fs.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
                if (err !== null) {
                    this.emitError(err);
                    return resolve();
                }
                this.emitDebug(`data file read. Got text:  ${txt}EOF`);
                try {
                    this.data = JSON.parse(txt);
                }
                catch (err) {
                    this.emitError(err);
                }
                return resolve();
            });
        });
    }
    saveData() {
        if (this.dataFile === null) {
            this.emitDebug(`not saving data as dataFile is null`);
            return;
        }
        this.emitDebug(`saving data`);
        fs.mkdir(path.dirname(this.dataFile), { recursive: true }, (err) => {
            if (err !== null) {
                this.emitError(err);
                return;
            }
            const txt = JSON.stringify(this.data);
            if (this.dataFile === null)
                return;
            fs.writeFile(this.dataFile, txt, (err) => {
                if (err !== null)
                    this.emitError(err);
            });
        });
    }
    isActive() {
        return this.intervalId !== null;
    }
    stop() {
        this.emitDebug(`stop() called`);
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier was not active."));
            return;
        }
        if (this.intervalId === null)
            return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
    _subscribe(channel) {
        if (!channelIdPattern.test(channel)) {
            this.emitError(new Error(`Invalid channel ID inputted: ${channel}`));
            return;
        }
        if (this.subscriptions.includes(channel)) {
            this.emitError(new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
            return;
        }
        ;
        this.subscriptions.push(channel);
    }
    subscribe(...channels) {
        this.emitDebug(`subscribe() called with args ${JSON.stringify(channels)}`);
        for (const channel of channels) {
            this._subscribe(channel);
        }
    }
    _unsubscribe(channel) {
        const index = this.subscriptions.indexOf(channel);
        if (index === -1) {
            this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${channel}`));
            return;
        }
        this.subscriptions.splice(index, 1);
    }
    unsubscribe(...channels) {
        this.emitDebug(`unsubscribe() called with args ${JSON.stringify(channels)}`);
        for (const channel of channels) {
            this._unsubscribe(channel);
        }
    }
    simulateNewVideo(properties) {
        let vid = {
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
        if (this.onNewVideo !== null)
            this.onNewVideo(vid);
    }
}
exports.Notifier = Notifier;

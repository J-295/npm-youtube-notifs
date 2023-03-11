"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionMethods = exports.DataStorageMethods = exports.Notifier = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const getChannelData_1 = require("./util/getChannelData");
const channelIdPattern = /^[0-9a-zA-Z_\-]{24}$/;
var DataStorageMethods;
(function (DataStorageMethods) {
    DataStorageMethods[DataStorageMethods["File"] = 0] = "File";
    DataStorageMethods[DataStorageMethods["None"] = 1] = "None";
})(DataStorageMethods || (DataStorageMethods = {}));
exports.DataStorageMethods = DataStorageMethods;
var SubscriptionMethods;
(function (SubscriptionMethods) {
    SubscriptionMethods[SubscriptionMethods["Polling"] = 0] = "Polling";
})(SubscriptionMethods || (SubscriptionMethods = {}));
exports.SubscriptionMethods = SubscriptionMethods;
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
        this.checkInterval = config.subscription.interval * 60 * 1000;
        this.dataFile = (config.dataStorage.file === undefined) ? null : node_path_1.default.resolve(config.dataStorage.file);
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
            if (!node_fs_1.default.existsSync(this.dataFile)) {
                this.emitDebug(`data file not exists`);
                return resolve();
            }
            this.emitDebug(`reading data file...`);
            node_fs_1.default.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
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
        node_fs_1.default.mkdir(node_path_1.default.dirname(this.dataFile), { recursive: true }, (err) => {
            if (err !== null) {
                this.emitError(err);
                return;
            }
            const txt = JSON.stringify(this.data);
            if (this.dataFile === null)
                return;
            node_fs_1.default.writeFile(this.dataFile, txt, (err) => {
                if (err !== null)
                    this.emitError(err);
            });
        });
    }
    doCheck() {
        this.emitDebug(`\n## DOING CHECK ##`);
        for (let i = 0; i < this.subscriptions.length; i++) {
            const channelId = this.subscriptions[i];
            this.emitDebug(`checking channel ${channelId}`);
            (0, getChannelData_1.getChannelData)(channelId)
                .then((channel) => {
                const prevLatestVidId = this.data.latestVids[channel.id];
                this.emitDebug(`[${channel.id}] prevLatestVidId: ${prevLatestVidId}`);
                this.emitDebug(`[${channel.id}] vid count: ${channel.videos.length}`);
                if (channel.videos.length === 0) {
                    this.data.latestVids[channel.id] = null;
                    return;
                }
                if (prevLatestVidId === undefined) {
                    this.emitDebug(`[${channel.id}] setting (first) latest vid to ${channel.videos[0].id}`);
                    this.data.latestVids[channel.id] = channel.videos[0].id;
                    this.saveData();
                    return;
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
                        this.saveData();
                        return;
                    }
                }
                let newVids = [];
                for (let j = 0; j < channel.videos.length; j++) {
                    if (channel.videos[j].id === prevLatestVidId) {
                        this.emitDebug(`[${channel.id}] reached prevLatestVidId`);
                        break;
                    }
                    newVids.push(channel.videos[j]);
                    this.emitDebug(`[${channel.id}] pushed vid ${channel.videos[j].id} into newVids`);
                }
                if (newVids.length === 0) {
                    this.emitDebug(`[${channel.id}] no new vids`);
                    return;
                }
                for (let j = newVids.length - 1; j >= 0; j--) {
                    if (this.onNewVideo !== null)
                        this.onNewVideo(newVids[j]);
                    this.emitDebug(`[${channel.id}] emitted newVid for ${newVids[j].id}`);
                }
                this.emitDebug(`[${channel.id}] setting latest vid to ${channel.videos[0].id}`);
                this.data.latestVids[channel.id] = channel.videos[0].id;
                this.saveData();
            })
                .catch((err) => {
                if (err.status === 404) {
                    this.emitError(new Error(`Unsubscribing from channel as not exists: "${channelId}"`));
                    this._unsubscribe(channelId);
                    return;
                }
                this.emitError(err);
            });
        }
    }
    isActive() {
        return this.intervalId !== null;
    }
    start() {
        this.emitDebug(`start() called`);
        if (this.isActive()) {
            this.emitError(new Error("start() was ran while the notifier was active."));
            return;
        }
        this.emitDebug(`checkInterval is ${this.checkInterval}ms, dataFile is "${this.dataFile}"`);
        this.getData()
            .then(() => {
            this.doCheck();
            this.intervalId = setInterval(() => {
                this.doCheck();
            }, this.checkInterval);
        });
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
    subscribe(channels) {
        const argIsString = typeof channels === "string";
        this.emitDebug(`subscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
        if (typeof channels === "string") {
            this._subscribe(channels);
        }
        else {
            for (let i = 0; i < channels.length; i++) {
                this._subscribe(channels[i]);
            }
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
    unsubscribe(channels) {
        const argIsString = typeof channels === "string";
        this.emitDebug(`unsubscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
        if (typeof channels === "string") {
            this._unsubscribe(channels);
        }
        else {
            for (let i = 0; i < channels.length; i++) {
                this._unsubscribe(channels[i]);
            }
        }
    }
    simulateNewVideo(properties) {
        let vid = {
            title: "Video Title",
            url: "Video URL",
            id: "Video ID",
            released: new Date(),
            description: "Video Description",
            width: 1,
            height: 2,
            thumb: {
                width: 1,
                height: 2,
                url: "Thumbnail URL"
            },
            channel: {
                title: "Channel Title",
                url: "Channel URL",
                id: "Channel ID",
                released: new Date()
            }
        };
        Object.assign(vid, properties);
        if (this.onNewVideo !== null)
            this.onNewVideo(vid);
    }
}
exports.Notifier = Notifier;

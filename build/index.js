"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notifier = void 0;
const node_events_1 = __importDefault(require("node:events"));
const getChannelData_1 = __importDefault(require("./util/getChannelData"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const channelIdPattern = /^[0-9a-zA-Z_\-]{24}$/;
class Notifier extends node_events_1.default {
    constructor(newVidCheckInterval, dataFileName) {
        super();
        this.subscriptions = [];
        this.dataFile = null;
        this.intervalId = null;
        this.data = {
            latestVids: {}
        };
        this.checkInterval = newVidCheckInterval * 1000;
        this.dataFile = (dataFileName === undefined) ? null : node_path_1.default.resolve(dataFileName);
    }
    getData() {
        return new Promise((resolve) => {
            if (this.dataFile === null) {
                this.emit("debug", `not getting data as dataFile is null`);
                return resolve();
            }
            if (!node_fs_1.default.existsSync(this.dataFile)) {
                this.emit("debug", `data file not exists`);
                return resolve();
            }
            this.emit("debug", `reading data file...`);
            node_fs_1.default.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
                if (err !== null) {
                    this.emit("error", err);
                    return resolve();
                }
                this.emit("debug", `data file read. Got text:  ${txt}\n\n[TEXT END]`);
                try {
                    this.data = JSON.parse(txt);
                }
                catch (err) {
                    this.emit("error", err);
                }
                return resolve();
            });
        });
    }
    saveData() {
        if (this.dataFile === null) {
            this.emit("debug", `not saving data as dataFile is null`);
            return;
        }
        this.emit("debug", `saving data`);
        node_fs_1.default.mkdir(node_path_1.default.dirname(this.dataFile), { recursive: true }, (err) => {
            if (err !== null) {
                this.emit("error", err);
                return;
            }
            const txt = JSON.stringify(this.data);
            if (this.dataFile === null)
                return;
            node_fs_1.default.writeFile(this.dataFile, txt, (err) => {
                if (err !== null)
                    this.emit("error", err);
            });
        });
    }
    doCheck() {
        this.emit("debug", `\n## DOING CHECK ##`);
        for (let i = 0; i < this.subscriptions.length; i++) {
            this.emit("debug", `checking channel ${this.subscriptions[i]}`);
            (0, getChannelData_1.default)(this.subscriptions[i])
                .then((channel) => {
                const prevLatestVidId = this.data.latestVids[channel.id];
                this.emit("debug", `[${channel.id}] prevLatestVidId: ${prevLatestVidId}`);
                this.emit("debug", `[${channel.id}] vid count: ${channel.videos.length}`);
                if (channel.videos.length === 0)
                    return;
                if (prevLatestVidId === undefined) {
                    this.emit("debug", `[${channel.id}] setting (first) latest vid to ${channel.videos[0].id}`);
                    this.data.latestVids[channel.id] = channel.videos[0].id;
                    this.saveData();
                    return;
                }
                const vidIds = channel.videos.map(v => v.id);
                this.emit("debug", `[${channel.id}] vidIds: ${JSON.stringify(vidIds, null, 2)}`);
                if (vidIds.includes(prevLatestVidId)) {
                    this.emit("debug", `[${channel.id}] vidIds includes prevLatestVidId`);
                }
                else {
                    this.emit("debug", `[${channel.id}] vidIds not includes prevLatestVidId`);
                    this.data.latestVids[channel.id] = channel.videos[0].id;
                    this.saveData();
                    return;
                }
                let newVids = [];
                for (let j = 0; j < channel.videos.length; j++) {
                    if (channel.videos[j].id === prevLatestVidId) {
                        this.emit("debug", `[${channel.id}] reached prevLatestVidId`);
                        break;
                    }
                    newVids.push(channel.videos[j]);
                    this.emit("debug", `[${channel.id}] pushed vid ${channel.videos[j].id} into newVids`);
                }
                if (newVids.length === 0) {
                    this.emit("debug", `[${channel.id}] no new vids`);
                    return;
                }
                for (let j = newVids.length - 1; j >= 0; j--) {
                    this.emit("newVid", newVids[j]);
                    this.emit("debug", `[${channel.id}] emitted newVid for ${newVids[j].id}`);
                }
                this.emit("debug", `[${channel.id}] setting latest vid to ${channel.videos[0].id}`);
                this.data.latestVids[channel.id] = channel.videos[0].id;
                this.saveData();
            })
                .catch((err) => {
                this.emit("error", err);
            });
        }
    }
    isActive() {
        return this.intervalId !== null;
    }
    start() {
        this.emit("debug", `start() called`);
        if (this.isActive()) {
            this.emit("error", new Error("start() was ran while the notifier was active."));
            return;
        }
        this.emit("debug", `checkInterval is ${this.checkInterval}, dataFile is "${this.dataFile}"`);
        this.getData()
            .then(() => {
            this.doCheck();
            this.intervalId = setInterval(() => {
                this.doCheck();
            }, this.checkInterval);
        });
    }
    stop() {
        this.emit("debug", `stop() called`);
        if (!this.isActive()) {
            this.emit("error", new Error("stop() was ran while the notifier was not active."));
            return;
        }
        if (this.intervalId === null)
            return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }
    _subscribe(channel) {
        if (!channelIdPattern.test(channel)) {
            this.emit("error", new Error(`Invalid channel ID inputted: ${channel}`));
            return;
        }
        if (this.subscriptions.includes(channel)) {
            this.emit("error", new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
            return;
        }
        ;
        this.subscriptions.push(channel);
    }
    subscribe(channels) {
        this.emit("debug", `subscribe() called with arg ${typeof channels === "string" ? channels : JSON.stringify(channels)}`);
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
            this.emit("error", new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${channel}`));
            return;
        }
        this.subscriptions.splice(index, 1);
    }
    unsubscribe(channels) {
        this.emit("debug", `unsubscribe() called with arg ${typeof channels === "string" ? channels : JSON.stringify(channels)}`);
        if (typeof channels === "string") {
            this._unsubscribe(channels);
        }
        else {
            for (let i = 0; i < channels.length; i++) {
                this._unsubscribe(channels[i]);
            }
        }
    }
}
exports.Notifier = Notifier;
exports.default = Notifier; // For backwards compatibility

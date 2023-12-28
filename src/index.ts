import * as fs from "node:fs";
import * as path from "node:path";
import { Video, getChannelData } from "./getChannelData";

const channelIdPattern = /^[0-9a-zA-Z_-]{24}$/;

enum DataStorageMethods {
    File,
    None
}

type PollingNotifierConfig = {
    /** In minutes */
    interval: number;
    dataStorage: {
        method: DataStorageMethods.File;
        file: string;
    } | {
        method: DataStorageMethods.None;
        file?: never;
    }
}

type Data = {
    latestVids: {
        [key: string]: string | null;
    }
}

class PollingNotifier {
    readonly subscriptions: string[] = [];
    private checkInterval: number;
    private dataFile: string | null = null;
    private intervalId: NodeJS.Timeout | null = null;
    private data: Data = {
        latestVids: {}
    };
    onError: ((err: any) => void) | null = null;
    onNewVideos: ((vids: Video[]) => void) | null = null;
    constructor(config: PollingNotifierConfig) {
        this.checkInterval = config.interval * 60 * 1000;
        this.dataFile = (config.dataStorage.file === undefined) ? null : path.resolve(config.dataStorage.file);
    }

    private emitError(err: any): void {
        if (this.onError === null) {
            throw err;
        } else {
            this.onError(err);
        }
    }

    private getData(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.dataFile === null) {
                return resolve();
            }
            if (!fs.existsSync(this.dataFile)) {
                return resolve();
            }
            fs.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
                if (err !== null) {
                    this.emitError(err);
                    return resolve();
                }
                try {
                    this.data = JSON.parse(txt);
                } catch (err) {
                    this.emitError(err);
                }
                return resolve();
            });
        });
    }

    private saveData(): void {
        if (this.dataFile === null) {
            return;
        }
        fs.mkdir(path.dirname(this.dataFile), { recursive: true }, (err) => {
            if (err !== null) {
                this.emitError(err);
                return;
            }
            const txt = JSON.stringify(this.data);
            if (this.dataFile === null) return;
            fs.writeFile(this.dataFile, txt, (err) => {
                if (err !== null) this.emitError(err);
            });
        });
    }

    private doChecks = async (): Promise<void> => {
        for (const channelId of this.subscriptions) {
            try {
                const channel = await getChannelData(channelId);
                if (channel === null) {
                    this.emitError(new Error(`Unsubscribing from channel as not exists: "${channelId}"`));
                    this._unsubscribe(channelId);
                    continue;
                }
                const prevLatestVidId = this.data.latestVids[channel.id];
                if (channel.videos.length === 0) {
                    this.data.latestVids[channel.id] = null;
                    continue;
                }
                if (prevLatestVidId === undefined) {
                    this.data.latestVids[channel.id] = channel.videos[0].id;
                    continue;
                }
                const vidIds = channel.videos.map((v) => v.id);
                if (prevLatestVidId !== null && !vidIds.includes(prevLatestVidId)) {
                    this.data.latestVids[channel.id] = channel.videos[0].id;
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
                if (this.onNewVideos !== null) this.onNewVideos(newVids.reverse());
                this.data.latestVids[channel.id] = channel.videos[0].id;
            } catch (err) {
                this.emitError(err);
            }
        }
        this.saveData();
    };

    isActive(): boolean {
        return this.intervalId !== null;
    }

    start = async (): Promise<void> => {
        if (this.isActive()) {
            this.emitError(new Error("start() was ran while the notifier was active."));
            return;
        }
        if (this.checkInterval <= 0) {
            this.emitError(new Error("checkInterval cannot be less than or equal to zero."));
            return;
        }
        await this.getData();
        await this.doChecks();
        this.intervalId = setInterval(this.doChecks, this.checkInterval);
    };

    stop(): void {
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier was not active."));
            return;
        }
        if (this.intervalId === null) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    private _subscribe(channel: string): void {
        if (!channelIdPattern.test(channel)) {
            this.emitError(new Error(`Invalid channel ID inputted: ${channel}`));
            return;
        }
        if (this.subscriptions.includes(channel)) {
            this.emitError(new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
            return;
        }
        this.subscriptions.push(channel);
    }
    subscribe(channels: string[]): void {
        for (const channel of channels) {
            this._subscribe(channel);
        }
    }

    private _unsubscribe(channel: string): void {
        const index = this.subscriptions.indexOf(channel);
        if (index === -1) {
            this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${channel}`));
            return;
        }
        this.subscriptions.splice(index, 1);
    }
    unsubscribe(channels: string[]): void {
        for (const channel of channels) {
            this._unsubscribe(channel);
        }
    }

    simulateNewVideo(properties?: Partial<Video>): void {
        const vid: Video = {
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
        if (this.onNewVideos !== null) this.onNewVideos([vid]);
    }
}

export { PollingNotifier, Video, DataStorageMethods };

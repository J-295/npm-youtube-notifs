import { StorageInterface, Store } from "./storage";
import { Video, getChannelData } from "./getChannelData";

const channelIdPattern = /^[0-9a-zA-Z_-]{24}$/;

type PollingNotifierConfig = {
    /** In minutes */
    interval: number;
    storage: StorageInterface;
}

class PollingNotifier {
    readonly subscriptions: string[] = [];
    private checkInterval: number;
    private intervalId: NodeJS.Timeout | null = null;
    private storage: StorageInterface;
    onError: ((err: any) => void) | null = null;
    onNewVideos: ((vids: Video[]) => void) | null = null;
    constructor(config: PollingNotifierConfig) {
        if (config.interval <= 0) throw new Error("interval cannot be zero or less");
        this.checkInterval = config.interval * 60 * 1000;
        this.storage = config.storage;
    }

    private emitError(err: any): void {
        if (this.onError === null) {
            throw err;
        } else {
            this.onError(err);
        }
    }

    private async doChecks(): Promise<void> {
        const data = await this.storage.get(Store.LatestVidIds, this.subscriptions);
        for (const channelId of this.subscriptions) {
            try {
                const channel = await getChannelData(channelId);
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
                if (this.onNewVideos !== null) this.onNewVideos(newVids.reverse());
                data[channel.id] = channel.videos[0].id;
            } catch (err) {
                this.emitError(err);
            }
        }
        await this.storage.set(Store.LatestVidIds, data);
    }

    isActive(): boolean {
        return this.intervalId !== null;
    }

    async start(): Promise<void> {
        if (this.isActive()) {
            this.emitError(new Error("start() was ran while the notifier was active."));
            return;
        }
        await this.doChecks();
        this.intervalId = setInterval(() => {
            this.doChecks();
        }, this.checkInterval);
    }

    stop(): void {
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier was not active."));
            return;
        }
        if (this.intervalId === null) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    subscribe(channels: string[]): void {
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
    unsubscribe(channels: string[]): void {
        for (const channel of channels) {
            const index = this.subscriptions.indexOf(channel);
            if (index === -1) {
                this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${JSON.stringify(channel)}`));
                return;
            }
            this.subscriptions.splice(index, 1);
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

export { PollingNotifier };

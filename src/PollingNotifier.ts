import { StorageInterface, Store } from "./storage";
import { Video, getChannelVideos } from "./getChannelVideos";

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
    onError: ((err: Error) => void) | null = null;
    onNewVideos: ((vids: Video[]) => void) | null = null;
    constructor(config: PollingNotifierConfig) {
        if (config.interval <= 0) throw new Error("interval can't be zero or less");
        this.checkInterval = config.interval * 60 * 1000;
        this.storage = config.storage;
    }

    private emitError(error: unknown): void {
        if (!(error instanceof Error)) {
            console.error("[youtube-notifs]: error is not an instance of Error");
            console.error(error);
            return;
        }
        if (this.onError === null) {
            console.error(error);
        } else {
            this.onError(error);
        }
    }

    private async doChecks(): Promise<void> {
        const data = await this.storage.get(Store.LatestVidIds, this.subscriptions);
        const dataChanges: Record<string, string> = {};
        for (const channelId of this.subscriptions) {
            try {
                const channelVideos = await getChannelVideos(channelId);
                if (channelVideos === null) {
                    this.unsubscribe(channelId);
                    throw new Error(`Unsubscribing from channel as it doesn't exist: "${channelId}"`);
                }
                const prevLatestVidId = data[channelId];
                if (channelVideos.length === 0) {
                    dataChanges[channelId] = "";
                    continue;
                }
                if (prevLatestVidId === null) {
                    dataChanges[channelId] = channelVideos[0].id;
                    continue;
                }
                const vidIds = channelVideos.map((v) => v.id);
                if (prevLatestVidId !== "" && !vidIds.includes(prevLatestVidId)) {
                    dataChanges[channelId] = channelVideos[0].id;
                    continue;
                }
                const newVids = [];
                for (const video of channelVideos) {
                    if (video.id === prevLatestVidId) {
                        break;
                    }
                    newVids.push(video);
                }
                if (newVids.length === 0) {
                    continue;
                }
                if (this.onNewVideos !== null) this.onNewVideos(newVids.reverse());
                dataChanges[channelId] = channelVideos[0].id;
            } catch (err) {
                this.emitError(err);
            }
        }
        if (Object.keys(dataChanges).length === 0) return;
        await this.storage.set(Store.LatestVidIds, dataChanges);
    }

    isActive(): boolean {
        return this.intervalId !== null;
    }

    start(): void {
        if (this.isActive()) {
            this.emitError(new Error("start() was ran while the notifier was already active"));
            return;
        }
        (async () => {
            await this.doChecks();
            this.intervalId = setInterval(() => {
                this.doChecks();
            }, this.checkInterval);
        })();
    }

    stop(): void {
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier wasn't active"));
            return;
        }
        clearInterval(this.intervalId!);
        this.intervalId = null;
    }

    subscribe(channel: string): void;
    subscribe(channels: string[]): void;
    subscribe(channel_or_channels: string | string[]): void {
        const channels = (typeof channel_or_channels === "string") ? [channel_or_channels] : channel_or_channels;
        for (const channel of channels) {
            if (!channelIdPattern.test(channel)) {
                this.emitError(new Error(`subscribe() was ran with an invalid channel ID: ${JSON.stringify(channel)}`));
                continue;
            }
            if (this.subscriptions.includes(channel)) {
                this.emitError(new Error(`subscribe() was ran with a channel ID that is already subscribed to: ${channel}`));
                continue;
            }
            this.subscriptions.push(channel);
        }
    }

    unsubscribe(channel: string): void;
    unsubscribe(channels: string[]): void;
    unsubscribe(channel_or_channels: string | string[]): void {
        const channels = (typeof channel_or_channels === "string") ? [channel_or_channels] : channel_or_channels;
        for (const channel of channels) {
            const index = this.subscriptions.indexOf(channel);
            if (index === -1) {
                this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${JSON.stringify(channel)}`));
                continue;
            }
            this.subscriptions.splice(index, 1);
        }
    }

    simulateNewVideo(properties?: Partial<Video>): void {
        const vid: Video = {
            title: "Video Title",
            url: "https://www.youtube.com/watch?v=XxXxXxXxXxX",
            id: "XxXxXxXxXxX",
            created: new Date(),
            description: "Video Description",
            width: 640,
            height: 390,
            thumb: {
                width: 480,
                height: 360,
                url: "https://iX.ytimg.com/vi/XxXxXxXxXxX/hqdefault.jpg"
            },
            channel: {
                name: "Channel Name",
                url: "https://www.youtube.com/channel/XXXXXXXXXXXXXXXXXXXXXXXX",
                id: "XXXXXXXXXXXXXXXXXXXXXXXX",
                created: new Date()
            }
        };
        Object.assign(vid, properties);
        if (this.onNewVideos !== null) this.onNewVideos([vid]);
    }
}

export { PollingNotifier };

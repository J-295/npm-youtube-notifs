import { StorageInterface, Store } from "./storage";
import { Video, getChannelVideos } from "./getChannelVideos";

const channelIdPattern = /^[0-9a-zA-Z_-]{24}$/;

type PollingNotifierConfig = {
    /** The number of minutes between checking for new videos. */
    interval: number;
    /**
     * The object that will handle storage of data.
     * - `JsonStorage` can be used to retain data during downtime so uploads within that period aren't missed.
     * - If uploads during downtime don't matter, `MemoryStorage` can be used instead.
     * - A custom `StorageInterface` extension can be created to store data between sessions in a different way, e.g., in a SQL database.
     */
    storage: StorageInterface;
}

/**
 * Checks for new videos on an interval.
 * - Will automatically unsubscribe from a channel ID and emit an error event if it doesn't exist.
 */
export class PollingNotifier {
    private checkIntervalMs: number;
    private storage: StorageInterface;
    private subscriptions: string[] = [];
    private intervalId: NodeJS.Timeout | null = null;
    /** Function for handling errors. If `null`, errors will be logged instead. */
    onError: ((error: Error) => void) | null = null;
    /** Function for handling video uploads. All new videos detected are given in chronological order. */
    onNewVideos: ((videos: Video[]) => void) | null = null;
    /** Will throw an error if interval is zero or less. */
    constructor(config: PollingNotifierConfig) {
        if (config.interval <= 0) throw new Error("interval can't be zero or less");
        this.checkIntervalMs = config.interval * 60 * 1000;
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
        const newVids = [];
        for (const channelId of this.subscriptions) {
            try {
                const channelVideos = await getChannelVideos(channelId);
                if (channelVideos === null) {
                    this.unsubscribe(channelId);
                    throw new Error(`Unsubscribing from channel as it doesn't exist: "${channelId}"`);
                }
                const prevLatestVidId = data[channelId]!;
                if (channelVideos.length === 0) {
                    dataChanges[channelId] = "";
                    continue;
                }
                if (prevLatestVidId === null) {
                    dataChanges[channelId] = channelVideos[0]!.id;
                    continue;
                }
                const vidIds = channelVideos.map((v) => v.id);
                if (prevLatestVidId !== "" && !vidIds.includes(prevLatestVidId)) {
                    dataChanges[channelId] = channelVideos[0]!.id;
                    continue;
                }
                for (const video of channelVideos) {
                    if (video.id === prevLatestVidId) break;
                    newVids.push(video);
                }
                dataChanges[channelId] = channelVideos[0]!.id;
            } catch (err) {
                this.emitError(err);
            }

            if (newVids.length === 0) continue;
            newVids.sort((a, b) => a.created.getTime() - b.created.getTime());
            if (this.onNewVideos !== null) this.onNewVideos(newVids);
        }
        if (Object.keys(dataChanges).length === 0) return;
        await this.storage.set(Store.LatestVidIds, dataChanges);
    }

    /** Returns whether the notifier is currently listening for new videos on the interval. */
    isActive(): boolean {
        return this.intervalId !== null;
    }
    /** Start listening for new videos. The notifier will instead emit an error event if it is already active. */
    start(): void {
        if (this.isActive()) {
            this.emitError(new Error("start() was ran while the notifier was already active"));
            return;
        }
        this.doChecks()
            .then(() => {
                this.intervalId = setInterval(() => {
                    this.doChecks();
                }, this.checkIntervalMs);
            });
    }
    /** Stop listening for new videos. The notifier will instead emit an error event if it isn't active. */
    stop(): void {
        if (!this.isActive()) {
            this.emitError(new Error("stop() was ran while the notifier wasn't active"));
            return;
        }
        clearInterval(this.intervalId!);
        this.intervalId = null;
    }

    /**
     * Subscribe to a channel ID or an array of channel IDs. The notifier will instead emit an error event for any ID which is already subscribed to or doesn't match the format of a channel ID.
     */
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
    /** Unsubscribe from a channel ID or an array of channel IDs. The notifier will instead emit an error event for any ID which isn't subscribed to. */
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
    /** Get a copy of the subscriptions list. */
    getSubscriptions(): string[] {
        return [...this.subscriptions];
    }

    /** Makes the notifier emit a fake video allowing you to test your code. */
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

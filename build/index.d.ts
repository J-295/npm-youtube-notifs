import { Video } from "./getChannelData";
declare enum DataStorageMethods {
    File = 0,
    None = 1
}
declare enum SubscriptionMethods {
    Polling = 0
}
type Config = {
    subscription: {
        method: SubscriptionMethods.Polling;
        /** In minutes */
        interval: number;
    };
    dataStorage: {
        method: DataStorageMethods.File;
        file: string;
    } | {
        method: DataStorageMethods.None;
        file?: never;
    };
};
declare class Notifier {
    readonly subscriptions: string[];
    private checkInterval;
    private dataFile;
    private intervalId;
    private data;
    onError: ((err: Error) => void) | null;
    onDebug: ((log: string) => void) | null;
    onNewVideo: ((vid: Video) => void) | null;
    constructor(config: Config);
    private emitError;
    private emitDebug;
    private getData;
    private saveData;
    private doChecks;
    isActive(): boolean;
    start(): void;
    stop(): void;
    private _subscribe;
    subscribe(...channels: string[]): void;
    private _unsubscribe;
    unsubscribe(...channels: string[]): void;
    simulateNewVideo(properties?: Partial<Video>): void;
}
export { Notifier, Video, DataStorageMethods, SubscriptionMethods };

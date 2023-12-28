import { Video } from "./getChannelData";
declare enum DataStorageMethods {
    File = 0,
    None = 1
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
    };
};
declare class PollingNotifier {
    readonly subscriptions: string[];
    private checkInterval;
    private dataFile;
    private intervalId;
    private data;
    onError: ((err: any) => void) | null;
    onDebug: ((log: string) => void) | null;
    onNewVideo: ((vid: Video) => void) | null;
    onNewVideos: ((vids: Video[]) => void) | null;
    constructor(config: PollingNotifierConfig);
    private emitError;
    private emitDebug;
    private getData;
    private saveData;
    private doChecks;
    isActive(): boolean;
    start: () => Promise<void>;
    stop(): void;
    private _subscribe;
    subscribe(...channels: string[]): void;
    private _unsubscribe;
    unsubscribe(...channels: string[]): void;
    simulateNewVideo(properties?: Partial<Video>): void;
}
export { PollingNotifier, Video, DataStorageMethods };

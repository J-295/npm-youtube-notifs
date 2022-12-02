/// <reference types="node" />
import EventEmitter from "node:events";
import { Video } from "./util/getChannelData";
declare enum DataStorageMethods {
    File = 0,
    None = 1
}
declare enum SubscriptionMethods {
    Polling = 0
}
declare type Config = {
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
declare class Notifier extends EventEmitter {
    readonly subscriptions: Array<string>;
    private checkInterval;
    private dataFile;
    private intervalId;
    private data;
    onError: ((err: Error) => void) | null;
    onDebug: ((log: string) => void) | null;
    onNewVideo: ((vid: Video) => void) | null;
    constructor(config: Config);
    constructor(newVidCheckInterval: number, dataFileName?: string);
    private emitError;
    private emitDebug;
    private getData;
    private saveData;
    private doCheck;
    isActive(): boolean;
    start(): void;
    stop(): void;
    private _subscribe;
    subscribe(channels: string | Array<string>): void;
    private _unsubscribe;
    unsubscribe(channels: string | Array<string>): void;
}
export default Notifier;
export { Notifier, Video, DataStorageMethods, SubscriptionMethods };

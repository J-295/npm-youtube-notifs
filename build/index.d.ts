/// <reference types="node" />
import EventEmitter from "node:events";
import { Video } from "./util/getChannelData";
declare class Notifier extends EventEmitter {
    readonly subscriptions: Array<string>;
    private checkInterval;
    private dataFile;
    private intervalId;
    private data;
    onError: ((err: Error) => void) | null;
    onDebug: ((log: string) => void) | null;
    onNewVideo: ((vid: Video) => void) | null;
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
export { Notifier, Video };

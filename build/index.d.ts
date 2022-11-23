/// <reference types="node" />
import EventEmitter from "node:events";
declare class Notifier extends EventEmitter {
    readonly subscriptions: Array<string>;
    private checkInterval;
    private dataFile;
    private intervalId;
    private data;
    constructor(newVidCheckInterval: number, dataFileName?: string);
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
export { Notifier };

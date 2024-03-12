import fs from "node:fs";
import path from "node:path";

/** Names of stores. Store names are 1-16 lowercase letters and underscores. */
export enum Store {
    LatestVidIds = "latest_vid_ids"
}

export abstract class StorageInterface {
    abstract get(store: Store, keys: string[]): Promise<Record<string, string | null>>;
    abstract set(store: Store, pairs: Record<string, string>): Promise<void>;
    abstract del(store: Store, keys: string[]): Promise<void>;
}

/** Store data in memory. */
export class MemoryStorage extends StorageInterface {
    protected data: Record<string, Record<string, string>> = {};
    async get(store: Store, keys: string[]) {
        const pairs: Record<string, string | null> = {};
        for (const key of keys) {
            pairs[key] = this.data[store]?.[key] ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: Record<string, string>) {
        if (this.data[store] === undefined) this.data[store] = {};
        Object.assign(this.data[store]!, pairs);
    }
    async del(store: Store, keys: string[]) {
        for (const key of keys) {
            delete this.data[store]?.[key];
        }
    }
}

/** Store data in a JSON file which is saved upon any data change. */
export class JsonStorage extends MemoryStorage {
    private filename: string;
    constructor(filename: string) {
        super();
        this.filename = filename;
        if (fs.existsSync(filename)) {
            this.data = JSON.parse(fs.readFileSync(filename, "utf-8"));
        } else {
            fs.mkdirSync(path.dirname(filename), { recursive: true });
            fs.writeFileSync(filename, "{}");
        }
    }
    async set(...args: Parameters<StorageInterface["set"]>) {
        await super.set(...args);
        fs.writeFileSync(this.filename, JSON.stringify(this.data));
    }
    async del(...args: Parameters<StorageInterface["del"]>) {
        await super.del(...args);
        fs.writeFileSync(this.filename, JSON.stringify(this.data));
    }
}

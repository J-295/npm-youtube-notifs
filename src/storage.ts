import fs from "node:fs";
import path from "node:path";

enum Store {
    LatestVidIds = "latest_vid_ids"
}

abstract class StorageInterface {
    abstract get(store: Store, keys: string[]): Promise<Record<string, string | null>>;
    abstract set(store: Store, pairs: Record<string, string>): Promise<void>;
    abstract del(store: Store, keys: string[]): Promise<void>;
}

class MemoryStorage extends StorageInterface {
    protected data: Record<string, Record<string, string>> = {};
    async get(store: Store, keys: string[]): Promise<Record<string, string | null>> {
        const pairs: Record<string, string | null> = {};
        for (const key of keys) {
            pairs[key] = this.data[store]?.[key] ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: Record<string, string>): Promise<void> {
        if (this.data[store] === undefined) this.data[store] = {};
        Object.assign(this.data[store]!, pairs);
    }
    async del(store: Store, keys: string[]): Promise<void> {
        for (const key of keys) {
            if (this.data[store]?.[key] !== undefined) delete this.data[store]![key];
        }
    }
}

class JsonStorage extends StorageInterface {
    private filename: string;
    protected data: Record<string, Record<string, string>>;
    constructor(filename: string) {
        super();
        this.filename = filename;
        if (fs.existsSync(filename)) {
            this.data = JSON.parse(fs.readFileSync(filename, { encoding: "utf-8" }));
        } else {
            fs.mkdirSync(path.dirname(filename), { recursive: true });
            fs.writeFileSync(filename, "{}");
            this.data = {};
        }
    }
    async get(store: Store, keys: string[]): Promise<Record<string, string | null>> {
        const pairs: Record<string, string | null> = {};
        for (const key of keys) {
            pairs[key] = this.data[store]?.[key] ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: Record<string, string>): Promise<void> {
        if (this.data[store] === undefined) this.data[store] = {};
        Object.assign(this.data[store]!, pairs);
        fs.writeFileSync(this.filename, JSON.stringify(this.data));
    }
    async del(store: Store, keys: string[]): Promise<void> {
        for (const key of keys) {
            if (this.data[store]?.[key] !== undefined) delete this.data[store]![key];
        }
        fs.writeFileSync(this.filename, JSON.stringify(this.data));
    }
}

export {
    Store, StorageInterface,
    MemoryStorage, JsonStorage
};

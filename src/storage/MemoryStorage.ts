import { StorageInterface, Store } from "../storage";

export class MemoryStorage extends StorageInterface {
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

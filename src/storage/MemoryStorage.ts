import { StorageInterface, Store } from "../storage";

export class MemoryStorage extends StorageInterface {
    private stores = new Map<Store, Map<string, string>>();
    async get(store: Store, keys: string[]): Promise<Record<string, string | null>> {
        const pairs: Record<string, string | null> = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = map?.get(key) ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: Record<string, string>): Promise<void> {
        if (!this.stores.has(store)) this.stores.set(store, new Map());
        const map = this.stores.get(store);
        for (const key of Object.keys(pairs)) {
            map?.set(key, pairs[key]);
        }
    }
    async del(store: Store, keys: string[]): Promise<void> {
        const map = this.stores.get(store);
        for (const key of keys) {
            map?.delete(key);
        }
    }
}

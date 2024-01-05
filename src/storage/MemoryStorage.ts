import { KeyValPairs, StorageInterface, Store } from "../storage";

export class MemoryStorage extends StorageInterface {
    private stores = new Map<Store, Map<string, string | null>>();
    async get(store: Store, keys: string[]): Promise<KeyValPairs> {
        const pairs: KeyValPairs = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = map?.get(key) ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: KeyValPairs): Promise<void> {
        if (this.stores.get(store) === undefined) this.stores.set(store, new Map());
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

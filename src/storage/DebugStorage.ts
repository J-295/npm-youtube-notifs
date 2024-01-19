import { KeyValPairs, StorageInterface, Store } from "../storage";

export class DebugStorage extends StorageInterface {
    stores = new Map<Store, Map<string, string | null>>();
    async get(store: Store, keys: string[]): Promise<KeyValPairs> {
        console.debug(`get: ${store} ${JSON.stringify(keys)}`);
        const pairs: KeyValPairs = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = map?.get(key) ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: KeyValPairs): Promise<void> {
        console.debug(`set: ${store} ${JSON.stringify(pairs)}`);
        if (!this.stores.has(store)) this.stores.set(store, new Map());
        const map = this.stores.get(store);
        for (const key of Object.keys(pairs)) {
            map?.set(key, pairs[key]);
        }
    }
    async del(store: Store, keys: string[]): Promise<void> {
        console.debug(`del: ${store} ${JSON.stringify(keys)}`);
        const map = this.stores.get(store);
        for (const key of keys) {
            map?.delete(key);
        }
    }
}

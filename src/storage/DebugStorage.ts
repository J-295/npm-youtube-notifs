import { StorageInterface, Store } from "../storage";

export class DebugStorage extends StorageInterface {
    stores = new Map<Store, Map<string, string>>();
    async get(store: Store, keys: string[]): Promise<Record<string, string | null>> {
        console.debug(`get: ${store} ${JSON.stringify(keys)}`);
        const pairs: Record<string, string | null> = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = map?.get(key) ?? null;
        }
        return pairs;
    }
    async set(store: Store, pairs: Record<string, string>): Promise<void> {
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

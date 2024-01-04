import { KeyValPairs, StorageInterface, Store } from "../storage";

export class DebugStorage extends StorageInterface {
    stores = new Map<Store, Map<string, string | null>>();
    get(store: Store, keys: string[]): Promise<KeyValPairs> {
        console.debug(`get: ${store} ${JSON.stringify(keys)}`);
        const pairs: KeyValPairs = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = map?.get(key) ?? null;
        }
        return Promise.resolve(pairs);
    }
    set(store: Store, pairs: KeyValPairs): Promise<void> {
        console.debug(`set: ${store} ${JSON.stringify(pairs)}`);
        if (this.stores.get(store) === undefined) this.stores.set(store, new Map());
        const map = this.stores.get(store);
        for (const key of Object.keys(pairs)) {
            map?.set(key, pairs[key]);
        }
        return Promise.resolve();
    }
    del(store: Store, keys: string[]): Promise<void> {
        console.debug(`del: ${store} ${JSON.stringify(keys)}`);
        const map = this.stores.get(store);
        for (const key of keys) {
            map?.delete(key);
        }
        return Promise.resolve();
    }
}

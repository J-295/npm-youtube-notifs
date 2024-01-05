import { KeyValPairs, StorageInterface, Store } from "../storage";
export declare class MemoryStorage extends StorageInterface {
    private stores;
    get(store: Store, keys: string[]): Promise<KeyValPairs>;
    set(store: Store, pairs: KeyValPairs): Promise<void>;
    del(store: Store, keys: string[]): Promise<void>;
}

import { KeyValPairs, StorageInterface, Store } from "../storage";
export declare class JsonStorage extends StorageInterface {
    private filename;
    private data;
    constructor(filename: string);
    get(store: Store, keys: string[]): Promise<KeyValPairs>;
    set(store: Store, pairs: KeyValPairs): Promise<void>;
    del(store: Store, keys: string[]): Promise<void>;
}

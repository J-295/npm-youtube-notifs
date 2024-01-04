declare enum Store {
    LatestVidIds = "latest_vid_ids"
}
type KeyValPairs = {
    [key: string]: string | null;
};
declare abstract class StorageInterface {
    abstract get(store: Store, keys: string[]): Promise<KeyValPairs>;
    abstract set(store: Store, pairs: KeyValPairs): Promise<void>;
    abstract del(store: Store, keys: string[]): Promise<void>;
}
declare class DebugStorage extends StorageInterface {
    private stores;
    get(store: Store, keys: string[]): Promise<KeyValPairs>;
    set(store: Store, pairs: KeyValPairs): Promise<void>;
    del(store: Store, keys: string[]): Promise<void>;
}
export { Store, KeyValPairs, StorageInterface, DebugStorage };

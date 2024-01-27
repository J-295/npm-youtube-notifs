enum Store {
    LatestVidIds = "latest_vid_ids"
}

abstract class StorageInterface {
    abstract get(store: Store, keys: string[]): Promise<Record<string, string | null>>;
    abstract set(store: Store, pairs: Record<string, string>): Promise<void>;
    abstract del(store: Store, keys: string[]): Promise<void>;
}

export { Store, StorageInterface };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorage = void 0;
const storage_1 = require("../storage");
class MemoryStorage extends storage_1.StorageInterface {
    constructor() {
        super(...arguments);
        this.stores = new Map();
    }
    get(store, keys) {
        var _a;
        const pairs = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = (_a = map === null || map === void 0 ? void 0 : map.get(key)) !== null && _a !== void 0 ? _a : null;
        }
        return Promise.resolve(pairs);
    }
    set(store, pairs) {
        if (this.stores.get(store) === undefined)
            this.stores.set(store, new Map());
        const map = this.stores.get(store);
        for (const key of Object.keys(pairs)) {
            map === null || map === void 0 ? void 0 : map.set(key, pairs[key]);
        }
        return Promise.resolve();
    }
    del(store, keys) {
        const map = this.stores.get(store);
        for (const key of keys) {
            map === null || map === void 0 ? void 0 : map.delete(key);
        }
        return Promise.resolve();
    }
}
exports.MemoryStorage = MemoryStorage;

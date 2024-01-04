"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugStorage = void 0;
const storage_1 = require("../storage");
class DebugStorage extends storage_1.StorageInterface {
    constructor() {
        super(...arguments);
        this.stores = new Map();
    }
    get(store, keys) {
        var _a;
        console.debug(`get: ${store} ${JSON.stringify(keys)}`);
        const pairs = {};
        const map = this.stores.get(store);
        for (const key of keys) {
            pairs[key] = (_a = map === null || map === void 0 ? void 0 : map.get(key)) !== null && _a !== void 0 ? _a : null;
        }
        return Promise.resolve(pairs);
    }
    set(store, pairs) {
        console.debug(`set: ${store} ${JSON.stringify(pairs)}`);
        if (this.stores.get(store) === undefined)
            this.stores.set(store, new Map());
        const map = this.stores.get(store);
        for (const key of Object.keys(pairs)) {
            map === null || map === void 0 ? void 0 : map.set(key, pairs[key]);
        }
        return Promise.resolve();
    }
    del(store, keys) {
        console.debug(`del: ${store} ${JSON.stringify(keys)}`);
        const map = this.stores.get(store);
        for (const key of keys) {
            map === null || map === void 0 ? void 0 : map.delete(key);
        }
        return Promise.resolve();
    }
}
exports.DebugStorage = DebugStorage;

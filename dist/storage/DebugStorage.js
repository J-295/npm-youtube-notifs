"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`get: ${store} ${JSON.stringify(keys)}`);
            const pairs = {};
            const map = this.stores.get(store);
            for (const key of keys) {
                pairs[key] = (_a = map === null || map === void 0 ? void 0 : map.get(key)) !== null && _a !== void 0 ? _a : null;
            }
            return pairs;
        });
    }
    set(store, pairs) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`set: ${store} ${JSON.stringify(pairs)}`);
            if (this.stores.get(store) === undefined)
                this.stores.set(store, new Map());
            const map = this.stores.get(store);
            for (const key of Object.keys(pairs)) {
                map === null || map === void 0 ? void 0 : map.set(key, pairs[key]);
            }
        });
    }
    del(store, keys) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`del: ${store} ${JSON.stringify(keys)}`);
            const map = this.stores.get(store);
            for (const key of keys) {
                map === null || map === void 0 ? void 0 : map.delete(key);
            }
        });
    }
}
exports.DebugStorage = DebugStorage;

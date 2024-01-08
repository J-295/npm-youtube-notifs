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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonStorage = void 0;
const storage_1 = require("../storage");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class JsonStorage extends storage_1.StorageInterface {
    constructor(filename) {
        super();
        this.filename = filename;
        if (node_fs_1.default.existsSync(filename)) {
            this.data = JSON.parse(node_fs_1.default.readFileSync(filename, { encoding: "utf-8" }));
        }
        else {
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(filename), { recursive: true });
            node_fs_1.default.writeFileSync(filename, "{}");
            this.data = {};
        }
    }
    get(store, keys) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const pairs = {};
            for (const key of keys) {
                pairs[key] = (_b = (_a = this.data[store]) === null || _a === void 0 ? void 0 : _a[key]) !== null && _b !== void 0 ? _b : null;
            }
            return pairs;
        });
    }
    set(store, pairs) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.data[store] === undefined)
                this.data[store] = {};
            Object.assign(this.data[store], pairs);
            node_fs_1.default.writeFileSync(this.filename, JSON.stringify(this.data));
        });
    }
    del(store, keys) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            for (const key of keys) {
                if (((_a = this.data[store]) === null || _a === void 0 ? void 0 : _a[key]) !== undefined)
                    delete this.data[store][key];
            }
            node_fs_1.default.writeFileSync(this.filename, JSON.stringify(this.data));
        });
    }
}
exports.JsonStorage = JsonStorage;

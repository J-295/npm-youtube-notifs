"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function default_1(path) {
    return new Promise((resolve, reject) => {
        let flags;
        if (node_fs_1.default.existsSync(path)) {
            flags = "r+";
        }
        else {
            flags = "w+";
            node_fs_1.default.mkdirSync(node_path_1.default.dirname(path), { recursive: true });
        }
        node_fs_1.default.open(path, flags, (err, fd) => {
            if (err !== null)
                reject(err);
            resolve(fd);
        });
    });
}
exports.default = default_1;

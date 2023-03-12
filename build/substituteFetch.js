"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.substituteFetch = void 0;
const https = __importStar(require("node:https"));
// Used if fetch is not available
function substituteFetch(url, init) {
    return new Promise((resolve, reject) => {
        const req = https.request(new URL(url), (res) => {
            let txt = "";
            res.on("data", (chunk) => {
                txt += chunk;
            });
            res.on("end", () => {
                if (res.statusCode === undefined)
                    return reject(new Error("statusCode is undefined"));
                resolve({
                    status: res.statusCode,
                    ok: 200 <= res.statusCode && res.statusCode <= 299,
                    text: () => new Promise((resolve) => resolve(txt))
                });
            });
        });
        req.on("error", (err) => {
            reject(err);
        });
        req.end();
    });
}
exports.substituteFetch = substituteFetch;

import EventEmitter from "node:events";
import { getChannelData, Video } from "./util/getChannelData";
import fs from "node:fs";
import path from "node:path";

const channelIdPattern = /^[0-9a-zA-Z_\-]{24}$/;

type Data = {
	latestVids: {
		[key: string]: string | null // Allows however many key val pairs
	}
}

class Notifier extends EventEmitter {
	readonly subscriptions: Array<string> = [];
	private checkInterval: number; // In milliseconds
	private dataFile: string | null = null;
	private intervalId: NodeJS.Timer | null = null;
	private data: Data = {
		latestVids: {}
	};
	onError: ((err: Error) => void) | null = null;
	onDebug: ((log: string) => void) | null = null;
	onNewVideo: ((vid: Video) => void) | null = null;
	constructor(newVidCheckInterval: number, dataFileName?: string) {
		super();
		this.on("error", () => { }); // For backwards compatibility, remove 2024  |  So program stays alive when no listener set
		this.checkInterval = newVidCheckInterval * 1000;
		this.dataFile = (dataFileName === undefined) ? null : path.resolve(dataFileName);
	}
	private emitError(err: any): void {
		this.emit("error", err); // For backwards compatibility, remove 2024
		if (this.onError === null) {
			throw err;
		} else {
			this.onError(<Error>err);
		}
	}
	private emitDebug(log: string): void {
		if (this.onDebug !== null) this.onDebug(log);
	}
	private getData(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.dataFile === null) {
				this.emitDebug(`not getting data as dataFile is null`);
				return resolve();
			}
			if (!fs.existsSync(this.dataFile)) {
				this.emitDebug(`data file not exists`);
				return resolve();
			}
			this.emitDebug(`reading data file...`);
			fs.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
				if (err !== null) {
					this.emitError(err);
					return resolve();
				}
				this.emitDebug(`data file read. Got text:  ${txt}\n\n[TEXT END]`);
				try {
					this.data = JSON.parse(txt);
				} catch (err) {
					this.emitError(err);
				}
				return resolve();
			});
		});
	}
	private saveData(): void {
		if (this.dataFile === null) {
			this.emitDebug(`not saving data as dataFile is null`);
			return;
		}
		this.emitDebug(`saving data`);
		fs.mkdir(path.dirname(this.dataFile), { recursive: true }, (err) => {
			if (err !== null) {
				this.emitError(err);
				return;
			}
			const txt = JSON.stringify(this.data);
			if (this.dataFile === null) return;
			fs.writeFile(this.dataFile, txt, (err) => {
				if (err !== null) this.emitError(err);
			});
		});
	}
	private doCheck(): void {
		this.emitDebug(`\n## DOING CHECK ##`);
		for (let i = 0; i < this.subscriptions.length; i++) {
			this.emitDebug(`checking channel ${this.subscriptions[i]}`);
			getChannelData(this.subscriptions[i])
				.then((channel) => {
					const prevLatestVidId = this.data.latestVids[channel.id];
					this.emitDebug(`[${channel.id}] prevLatestVidId: ${prevLatestVidId}`);
					this.emitDebug(`[${channel.id}] vid count: ${channel.videos.length}`);
					if (channel.videos.length === 0) {
						this.data.latestVids[channel.id] = null;
						return;
					}
					if (prevLatestVidId === undefined) {
						this.emitDebug(`[${channel.id}] setting (first) latest vid to ${channel.videos[0].id}`);
						this.data.latestVids[channel.id] = channel.videos[0].id;
						this.saveData();
						return;
					}
					const vidIds = channel.videos.map(v => v.id);
					this.emitDebug(`[${channel.id}] vidIds: ${JSON.stringify(vidIds, null, 2)}`);
					if (prevLatestVidId !== null) {
						if (vidIds.includes(prevLatestVidId)) {
							this.emitDebug(`[${channel.id}] vidIds includes prevLatestVidId`);
						} else {
							this.emitDebug(`[${channel.id}] vidIds not includes prevLatestVidId`);
							this.data.latestVids[channel.id] = channel.videos[0].id;
							this.saveData();
							return;
						}
					}
					let newVids = [];
					for (let j = 0; j < channel.videos.length; j++) {
						if (channel.videos[j].id === prevLatestVidId) {
							this.emitDebug(`[${channel.id}] reached prevLatestVidId`);
							break;
						}
						newVids.push(channel.videos[j]);
						this.emitDebug(`[${channel.id}] pushed vid ${channel.videos[j].id} into newVids`);
					}
					if (newVids.length === 0) {
						this.emitDebug(`[${channel.id}] no new vids`);
						return;
					}
					for (let j = newVids.length - 1; j >= 0; j--) {
						this.emit("newVid", newVids[j]); // For backwards compatibility, remove 2024
						if (this.onNewVideo !== null) this.onNewVideo(newVids[j]);
						this.emitDebug(`[${channel.id}] emitted newVid for ${newVids[j].id}`);
					}
					this.emitDebug(`[${channel.id}] setting latest vid to ${channel.videos[0].id}`);
					this.data.latestVids[channel.id] = channel.videos[0].id;
					this.saveData();
				})
				.catch((err) => {
					this.emitError(err);
				});
		}
	}
	isActive(): boolean {
		return this.intervalId !== null;
	}
	start(): void {
		this.emitDebug(`start() called`);
		if (this.isActive()) {
			this.emitError(new Error("start() was ran while the notifier was active."));
			return;
		}
		this.emitDebug(`checkInterval is ${this.checkInterval}ms, dataFile is "${this.dataFile}"`);
		this.getData()
			.then(() => {
				this.doCheck();
				this.intervalId = setInterval(() => {
					this.doCheck();
				}, this.checkInterval);
			});
	}
	stop(): void {
		this.emitDebug(`stop() called`);
		if (!this.isActive()) {
			this.emitError(new Error("stop() was ran while the notifier was not active."));
			return;
		}
		if (this.intervalId === null) return;
		clearInterval(this.intervalId);
		this.intervalId = null;
	}
	private _subscribe(channel: string): void {
		if (!channelIdPattern.test(channel)) {
			this.emitError(new Error(`Invalid channel ID inputted: ${channel}`));
			return;
		}
		if (this.subscriptions.includes(channel)) {
			this.emitError(new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
			return;
		};
		this.subscriptions.push(channel);
	}
	subscribe(channels: string | Array<string>): void {
		const argIsString = typeof channels === "string";
		this.emitDebug(`subscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
		if (typeof channels === "string") {
			this._subscribe(channels);
		} else {
			for (let i = 0; i < channels.length; i++) {
				this._subscribe(channels[i]);
			}
		}
	}
	private _unsubscribe(channel: string): void {
		const index = this.subscriptions.indexOf(channel);
		if (index === -1) {
			this.emitError(new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${channel}`));
			return;
		}
		this.subscriptions.splice(index, 1);
	}
	unsubscribe(channels: string | Array<string>): void {
		const argIsString = typeof channels === "string";
		this.emitDebug(`unsubscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
		if (typeof channels === "string") {
			this._unsubscribe(channels);
		} else {
			for (let i = 0; i < channels.length; i++) {
				this._unsubscribe(channels[i]);
			}
		}
	}
}

export default Notifier; // For backwards compatibility, remove 2024
export { Notifier, Video }

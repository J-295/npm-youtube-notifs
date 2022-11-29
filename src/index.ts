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
	constructor(newVidCheckInterval: number, dataFileName?: string) {
		super();
		this.checkInterval = newVidCheckInterval * 1000;
		this.dataFile = (dataFileName === undefined) ? null : path.resolve(dataFileName);
	}
	private getData(): Promise<void> {
		return new Promise<void>((resolve) => {
			if (this.dataFile === null) {
				this.emit("debug", `not getting data as dataFile is null`);
				return resolve();
			}
			if (!fs.existsSync(this.dataFile)) {
				this.emit("debug", `data file not exists`);
				return resolve();
			}
			this.emit("debug", `reading data file...`);
			fs.readFile(this.dataFile, { encoding: "utf-8" }, (err, txt) => {
				if (err !== null) {
					this.emit("error", err);
					return resolve();
				}
				this.emit("debug", `data file read. Got text:  ${txt}\n\n[TEXT END]`);
				try {
					this.data = JSON.parse(txt);
				} catch (err) {
					this.emit("error", err);
				}
				return resolve();
			});
		});
	}
	private saveData(): void {
		if (this.dataFile === null) {
			this.emit("debug", `not saving data as dataFile is null`);
			return;
		}
		this.emit("debug", `saving data`);
		fs.mkdir(path.dirname(this.dataFile), { recursive: true }, (err) => {
			if (err !== null) {
				this.emit("error", err);
				return;
			}
			const txt = JSON.stringify(this.data);
			if (this.dataFile === null) return;
			fs.writeFile(this.dataFile, txt, (err) => {
				if (err !== null) this.emit("error", err);
			});
		});
	}
	private doCheck(): void {
		this.emit("debug", `\n## DOING CHECK ##`);
		for (let i = 0; i < this.subscriptions.length; i++) {
			this.emit("debug", `checking channel ${this.subscriptions[i]}`);
			getChannelData(this.subscriptions[i])
				.then((channel) => {
					const prevLatestVidId = this.data.latestVids[channel.id];
					this.emit("debug", `[${channel.id}] prevLatestVidId: ${prevLatestVidId}`);
					this.emit("debug", `[${channel.id}] vid count: ${channel.videos.length}`);
					if (channel.videos.length === 0) {
						this.data.latestVids[channel.id] = null;
						return;
					}
					if (prevLatestVidId === undefined) {
						this.emit("debug", `[${channel.id}] setting (first) latest vid to ${channel.videos[0].id}`);
						this.data.latestVids[channel.id] = channel.videos[0].id;
						this.saveData();
						return;
					}
					const vidIds = channel.videos.map(v => v.id);
					this.emit("debug", `[${channel.id}] vidIds: ${JSON.stringify(vidIds, null, 2)}`);
					if (prevLatestVidId !== null) {
						if (vidIds.includes(prevLatestVidId)) {
							this.emit("debug", `[${channel.id}] vidIds includes prevLatestVidId`);
						} else {
							this.emit("debug", `[${channel.id}] vidIds not includes prevLatestVidId`);
							this.data.latestVids[channel.id] = channel.videos[0].id;
							this.saveData();
							return;
						}
					}
					let newVids = [];
					for (let j = 0; j < channel.videos.length; j++) {
						if (channel.videos[j].id === prevLatestVidId) {
							this.emit("debug", `[${channel.id}] reached prevLatestVidId`);
							break;
						}
						newVids.push(channel.videos[j]);
						this.emit("debug", `[${channel.id}] pushed vid ${channel.videos[j].id} into newVids`);
					}
					if (newVids.length === 0) {
						this.emit("debug", `[${channel.id}] no new vids`);
						return;
					}
					for (let j = newVids.length - 1; j >= 0; j--) {
						this.emit("newVid", newVids[j]);
						this.emit("debug", `[${channel.id}] emitted newVid for ${newVids[j].id}`);
					}
					this.emit("debug", `[${channel.id}] setting latest vid to ${channel.videos[0].id}`);
					this.data.latestVids[channel.id] = channel.videos[0].id;
					this.saveData();
				})
				.catch((err) => {
					this.emit("error", err);
				});
		}
	}
	isActive(): boolean {
		return this.intervalId !== null;
	}
	start(): void {
		this.emit("debug", `start() called`);
		if (this.isActive()) {
			this.emit("error", new Error("start() was ran while the notifier was active."));
			return;
		}
		this.emit("debug", `checkInterval is ${this.checkInterval}ms, dataFile is "${this.dataFile}"`);
		this.getData()
			.then(() => {
				this.doCheck();
				this.intervalId = setInterval(() => {
					this.doCheck();
				}, this.checkInterval);
			});
	}
	stop(): void {
		this.emit("debug", `stop() called`);
		if (!this.isActive()) {
			this.emit("error", new Error("stop() was ran while the notifier was not active."));
			return;
		}
		if (this.intervalId === null) return;
		clearInterval(this.intervalId);
		this.intervalId = null;
	}
	private _subscribe(channel: string): void {
		if (!channelIdPattern.test(channel)) {
			this.emit("error", new Error(`Invalid channel ID inputted: ${channel}`));
			return;
		}
		if (this.subscriptions.includes(channel)) {
			this.emit("error", new Error(`An attempt was made to subscribe to an already subscribed-to channel: ${channel}`));
			return;
		};
		this.subscriptions.push(channel);
	}
	subscribe(channels: string | Array<string>): void {
		const argIsString = typeof channels === "string";
		this.emit("debug", `subscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
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
			this.emit("error", new Error(`An attempt was made to unsubscribe from a not-subscribed-to channel: ${channel}`));
			return;
		}
		this.subscriptions.splice(index, 1);
	}
	unsubscribe(channels: string | Array<string>): void {
		const argIsString = typeof channels === "string";
		this.emit("debug", `unsubscribe() called with ${argIsString ? "" : "non-"}string arg ${argIsString ? channels : JSON.stringify(channels)}`);
		if (typeof channels === "string") {
			this._unsubscribe(channels);
		} else {
			for (let i = 0; i < channels.length; i++) {
				this._unsubscribe(channels[i]);
			}
		}
	}
}

export default Notifier; // For backwards compatibility
export { Notifier, Video }

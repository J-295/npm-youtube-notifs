"use strict";

const fs = require("fs");
const axios = require("axios");
const parseXml = require("xml2js").parseString;
const EventEmitter = require("events");
const events = new EventEmitter();
const path = require("path");
const logger = require("@james-bennett-295/logger");

let dataFilePath = "./ytNotifsData.json";
let subscriptions = [];
let data = {
	"latestVids": {},
	"channelNames": {},
	"permanentSubscriptions": []
};
let checkIntervalId;

function saveDataFile() {
	logger.debug("[youtube-notifs]: Attempting to save data file...");
	fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
		if (err) return logger.error("[youtube-notifs]: An error occured while trying to save the data file: " + err);
		logger.debug("[youtube-notifs]: Data file saved");
	});
};

function start(newVidCheckInterval, inputDataFilePath) {

	logger.triggerAlert();

	if (typeof (newVidCheckInterval) === "undefined") newVidCheckInterval = 120;
	if (typeof (inputDataFilePath) !== "undefined") dataFilePath = inputDataFilePath;
	logger.debug("[youtube-notifs]: start function ran. Args:\n\t" + newVidCheckInterval + "\n\t" + inputDataFilePath);
	fs.stat(dataFilePath, (err, stat) => {
		if (err && err.code === "ENOENT") {
			logger.info("[youtube-notifs]: Data file does not exist, attempting to create...");
			fs.promises.mkdir(path.dirname(dataFilePath), { recursive: true })
				.then(() => {
					fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
						if (err) return logger.error("[youtube-notifs]: An error occured while trying to create the data file: " + err);
						logger.info("[youtube-notifs]: Data file created");
					});
				})
				.catch((err) => {
					logger.error("[youtube-notifs]: Failed to create dir for data file: " + err);
				});
		} else {
			if (err) return logger.error("[youtube-notifs]: An error occured while trying to stat the data file: " + err);
			logger.debug("[youtube-notifs]: Data file already exists, attempting to read file...");
			fs.readFile(dataFilePath, (err, fileData) => {
				if (err) return logger.error("[youtube-notifs]: An error occured while trying to read the data file: " + err);
				logger.debug("[youtube-notifs]: Data file has been read. Data:\t" + fileData);
				data = JSON.parse(fileData.toString());
				subscriptions = subscriptions.concat(data.permanentSubscriptions);
			});
		};
	});
	let newVids = [];
	let saveFile = false;
	let allVidIds = [];
	let vidObj = {};
	checkIntervalId = setInterval(() => {
		subscriptions.forEach(channelId => {
			logger.debug("[youtube-notifs]: Doing new vid check for channel " + channelId + "...");
			axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId)
				.then((res) => {
					parseXml(res.data, (err, channelData) => {
						if (err) return logger.error("[youtube-notifs]: Failed to parse retrieved XML: " + err);
						if (!channelData.feed.entry || channelData.feed.entry.length < 1) return logger.debug("[youtube-notifs]: New vid check for channel " + channelId + " complete (no vids on channel)");
						if (!data.latestVids[channelId]) {
							logger.debug("[youtube-notifs]: New vid check for channel " + channelId + " complete (data.latestVids does not contain key for channel)");
							data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
							saveFile = true;
							return;
						};
						allVidIds = channelData.feed.entry.map(vid => vid["yt:videoId"][0]);
						if (!allVidIds.includes(data.latestVids[channelId])) {
							logger.debug(
								"[youtube-notifs]: New vid check for channel " + channelId + " complete (no vid with ID of latestVids[x])\n" +
								"\tlatestVids[x] will be set to ID of latest vid in channel"
							);
							data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
							saveDataFile();
							return;
						};
						newVids = [];
						for (let i in channelData.feed.entry) {
							if (channelData.feed.entry[i]["yt:videoId"][0] === data.latestVids[channelId]) break;
							vidObj = {
								vid: {
									name: channelData.feed.entry[i].title[0],
									url: channelData.feed.entry[i].link[0].$.href,
									description: channelData.feed.entry[i]["media:group"][0]["media:description"][0],
									id: channelData.feed.entry[i]["yt:videoId"][0],
									width: parseInt(channelData.feed.entry[i]["media:group"][0]["media:content"][0].$.width),
									height: parseInt(channelData.feed.entry[i]["media:group"][0]["media:content"][0].$.height),
									thumbnail: {
										url: channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.url,
										width: parseInt(channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.width),
										height: parseInt(channelData.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.height)
									}
								},
								channel: {
									name: channelData.feed.title[0],
									url: channelData.feed.entry[i].author[0].uri[0],
									id: channelData.feed["yt:channelId"][0]
								}
							};
							newVids.push(vidObj);
						};
						if (newVids.length > 0) saveFile = true;
						newVids.reverse().forEach(obj => {
							events.emit("newVid", obj);
							logger.debug("[youtube-notifs]: newVid event emitted. Vid ID: " + obj.vid.id);
						});
						data.latestVids[channelId] = channelData.feed.entry[0]["yt:videoId"][0];
						data.channelNames[channelId] = channelData.feed.title[0];
						logger.debug("[youtube-notifs]: New vid check for channel " + channelId + " complete (feed entries scanned)");
					});
				})
				.catch((err) => {
					if (err.response.status === 404) return logger.error("[youtube-notifs]: Failed to fetch data for channel '" + channelId + "' with status code 404. Make sure the channel exists!");
					logger.error("[youtube-notifs]: Failed to fetch data: " + err);
				});
		});
		if (saveFile) {
			saveFile = false;
			saveDataFile();
		};
	}, newVidCheckInterval * 1000);
};

function stop() {
	logger.debug("[youtube-notifs]: stop function ran");
	clearInterval(checkIntervalId);
};

function subscribe(channelIds) {
	logger.debug("[youtube-notifs]: subscribe function ran. Args:\n\t" + JSON.stringify(channelIds));
	for (let i in channelIds) {
		if (subscriptions.includes(channelIds[i])) {
			logger.warn("[youtube-notifs]: Channel " + channelIds[i] + " was not subscribed to because it is already subscribed to!");
			continue;
		};
		subscriptions.push(channelIds[i]);
	};
};

function msg(text, obj) {
	logger.debug("[youtube-notifs]: msg function ran. Args:\n\t" + text + "\n\t" + JSON.stringify(obj));
	return text
		.replaceAll("{vidName}", obj.vid.name)
		.replaceAll("{vidUrl}", obj.vid.url)
		.replaceAll("{vidDescription}", obj.vid.description)
		.replaceAll("{vidId}", obj.vid.id)
		.replaceAll("{vidWidth}", obj.vid.width)
		.replaceAll("{vidHeight}", obj.vid.height)
		.replaceAll("{vidThumbnailUrl}", obj.vid.thumbnail.url)
		.replaceAll("{vidThumbnailWidth}", obj.vid.thumbnail.width)
		.replaceAll("{vidThumbnailHeight}", obj.vid.thumbnail.height)
		.replaceAll("{channelName}", obj.channel.name)
		.replaceAll("{channelUrl}", obj.channel.url)
		.replaceAll("{channelId}", obj.channel.id);
};

function getSubscriptions() {
	logger.debug("[youtube-notifs]: getSubscriptions function ran");
	return subscriptions;
};

function unsubscribe(channelIds) {
	logger.debug("[youtube-notifs]: unsubscribe function ran. Args:\n\t" + JSON.stringify(channelIds));
	channelIds.forEach(element => {
		subscriptions.splice(subscriptions.indexOf(element), 1);
	});
};

function getChannelName(channelId) {
	logger.debug("[youtube-notifs]: getChannelName function ran. Args:\n\t" + channelId);
	return data.channelNames[channelId];
};

function permanentSubscribe(channelIds) {
	logger.debug("[youtube-notifs]: permanentSubscribe function ran. Args:\n\t" + JSON.stringify(channelIds));
	setTimeout(() => {
		subscribe(channelIds);
		for (let i in channelIds) {
			if (data.permanentSubscriptions.includes(channelIds[i])) {
				logger.warn("[youtube-notifs]: Channel " + channelIds[i] + " was not permanently subscribed to because it already is permanently subscribed to!");
				continue;
			};
			data.permanentSubscriptions.push(channelIds[i]);
		};
		saveDataFile();
	}, 100);
};

function permanentUnsubscribe(channelIds) {
	logger.debug("[youtube-notifs]: permanentUnsubscribe function ran. Args:\n\t" + JSON.stringify(channelIds));
	setTimeout(() => {
		unsubscribe(channelIds);
		channelIds.forEach(element => {
			data.permanentSubscriptions.splice(data.permanentSubscriptions.indexOf(element), 1);
		});
		saveDataFile();
	}, 100);
};

function delChannelsData(channelIds) {
	logger.debug("[youtube-notifs]: delChannelsData function ran. Args:\n\t" + JSON.stringify(channelIds));
	permanentUnsubscribe(channelIds);
	channelIds.forEach(element => {
		delete data.latestVids[element];
		delete data.channelNames[element];
	});
	saveDataFile();
};

module.exports = {
	start,
	stop,
	subscribe,
	msg,
	getSubscriptions,
	unsubscribe,
	getChannelName,
	permanentSubscribe,
	permanentUnsubscribe,
	delChannelsData,
	events
};

const fs = require("fs");
const axios = require("axios");
const parseXml = require("xml2js").parseString;
const EventEmitter = require("events");
const events = new EventEmitter();
const path = require("path");
const logger = require("@james-bennett-295/logger");

let dataFilePath;
let channels = [];
let data = {
	"latestVids": {},
	"channelNames": {},
	"permanentSubscriptions": []
};

function saveDataFile() {
	logger.debug("[youtube-notifs]: Attempting to save data file...");
	fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
		if (err) return logger.error("[youtube-notifs]: An error occured while trying to save the data file: " + err);
		logger.debug("[youtube-notifs]: Data file saved");
	});
};

function start(newVidCheckIntervalInSeconds, inputDataFilePath) {
	if (typeof (newVidCheckIntervalInSeconds) === "undefined") newVidCheckIntervalInSeconds = 120;
	if (typeof (inputDataFilePath) === "undefined") {
		dataFilePath = "./ytNotifsData.json";
	} else {
		dataFilePath = inputDataFilePath;
	};
	logger.debug("[youtube-notifs]: Start function ran. Args:\t" + newVidCheckIntervalInSeconds + "\t" + inputDataFilePath);
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
					logger.error("[youtube-notifs]: Failed to create path for data file: " + err);
				});
		} else {
			if (err) return logger.error("[youtube-notifs]: An error occured while trying to stat data file: " + err);
			logger.debug("[youtube-notifs]: Data file already exists, attempting to read file...");
			fs.readFile(dataFilePath, (err, fileData) => {
				if (err) return logger.error("[youtube-notifs]: An error occured while trying to read the data file: " + err);
				logger.debug("[youtube-notifs]: Data file has been read. Data:\t" + fileData);
				data = JSON.parse(fileData.toString());
				channels = channels.concat(data.permanentSubscriptions);
			});
		};
	});
	let newVids = [];
	let saveFile = false;
	setInterval(() => {
		channels.forEach(element => {
			logger.debug("[youtube-notifs]: Doing new vid check for channel " + element + "...");
			axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + element)
				.then((res) => {
					parseXml(res.data, (err, parsed) => {
						if (err) return logger.error("[youtube-notifs]: Failed to parse XML response from youtube: " + err);
						if (!parsed.feed.entry || parsed.feed.entry.length < 1) return logger.debug("[youtube-notifs]: New vid check for channel " + element + " complete (no vids on channel)");
						if (!data.latestVids[element]) {
							logger.debug("[youtube-notifs]: New vid check for channel " + element + " complete (channel is not key in data.latestVids)");
							data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
							saveFile = true;
							return;
						};
						newVids = [];
						for (i in parsed.feed.entry) {
							if (parsed.feed.entry[i]["yt:videoId"][0] === data.latestVids[element]) break;
							const obj = {
								vid: {
									name: parsed.feed.entry[i].title[0],
									url: parsed.feed.entry[i].link[0].$.href,
									description: parsed.feed.entry[i]["media:group"][0]["media:description"][0],
									id: parsed.feed.entry[i]["yt:videoId"][0],
									width: parseInt(parsed.feed.entry[i]["media:group"][0]["media:content"][0].$.width),
									height: parseInt(parsed.feed.entry[i]["media:group"][0]["media:content"][0].$.height),
									thumbnail: {
										url: parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.url,
										width: parseInt(parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.width),
										height: parseInt(parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.height)
									}
								},
								channel: {
									name: parsed.feed.title[0],
									url: parsed.feed.entry[i].author[0].uri[0],
									id: parsed.feed["yt:channelId"][0]
								}
							};
							newVids.push(obj);
						};
						if (newVids.length > 0) saveFile = true;
						newVids.reverse().forEach(obj => {
							events.emit("newVid", obj);
							logger.debug("[youtube-notifs]: newVid event emitted. Vid ID: " + obj.vid.id);
						});
						data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
						data.channelNames[element] = parsed.feed.title[0];
						logger.debug("[youtube-notifs]: New vid check for channel " + element + " complete (feed entries scanned)");
					});
				})
				.catch((err) => {
					logger.error("[youtube-notifs]: Failed to fetch data from youtube: " + err);
				});
		});
		setTimeout(() => {
			if (saveFile) {
				saveFile = false;
				saveDataFile();
			};
		}, 250);
	}, newVidCheckIntervalInSeconds * 1000);
};

function subscribe(channelIds) {
	logger.debug("[youtube-notifs]: subscribe function ran. Args:\t" + JSON.stringify(channelIds));
	for (i in channelIds) {
		if (channels.includes(channelIds[i])) {
			logger.warn("[youtube-notifs]: Channel " + channelIds[i] + " was not subscribed to because it is already subscribed to!");
			continue;
		};
		channels.push(channelIds[i]);
	};
};

function msg(text, obj) {
	logger.debug("[youtube-notifs]: msg function ran. Args:\t" + text + "\t" + JSON.stringify(obj));
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
	return channels;
};

function unsubscribe(channelIds) {
	logger.debug("[youtube-notifs]: unsubscribe function ran. Args:\t" + JSON.stringify(channelIds));
	channelIds.forEach(element => {
		channels.splice(channels.indexOf(element), 1);
	});
};

function getChannelName(channelId) {
	logger.debug("[youtube-notifs]: getChannelName function ran. Args:\t" + channelId);
	return data.channelNames[channelId];
};

function permanentSubscribe(channelIds) {
	logger.debug("[youtube-notifs]: permanentSubscribe function ran. Args:\t" + JSON.stringify(channelIds));
	setTimeout(() => {
		subscribe(channelIds);
		for (i in channelIds) {
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
	logger.debug("[youtube-notifs]: permanentUnsubscribe function ran. Args:\t" + JSON.stringify(channelIds));
	setTimeout(() => {
		unsubscribe(channelIds);
		channelIds.forEach(element => {
			data.permanentSubscriptions.splice(data.permanentSubscriptions.indexOf(element), 1);
		});
		saveDataFile();
	}, 100);
};

function delChannelsData(channelIds) {
	logger.debug("[youtube-notifs]: delChannelsData function ran. Args:" + JSON.stringify(channelIds));
	permanentUnsubscribe(channelIds);
	channelIds.forEach(element => {
		delete data.latestVids[element];
		delete data.channelNames[element];
	});
	saveDataFile();
};

module.exports = {
	start,
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

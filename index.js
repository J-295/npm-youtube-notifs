const fs = require("fs");
const axios = require("axios");
const parseXml = require("xml2js").parseString;
const EventEmitter = require("events");
const events = new EventEmitter();
const path = require("path");

var debugModeEnabled = false;
var saveFile = false;
var dataFilePath;
var preventDuplicateSubscriptions;
var channels = [];
var data = {
	"latestVids": {},
	"channelNames": {},
	"permanentSubscriptions": []
};

function log(line, type) {
	switch (type) {
		case 0:
			console.log("[youtube-notifs] INFO: " + line);
			break;
		case 1:
			console.log("[youtube-notifs] WARN: " + line);
			break;
		case 2:
			console.log("[youtube-notifs] ERROR: " + line);
			break;
		case 3:
			if (debugModeEnabled) { 
				console.log("[youtube-notifs] DEBUG: " + line);
			};
			break;
	};
};

function start(newVidCheckIntervalInSeconds, inputDataFilePath, inputPreventDuplicateSubscriptions, dataFileAutoSaveIntervalInSeconds, inputDebugModeEnabled) {
	log("start function ran", 3);
	if (typeof(newVidCheckIntervalInSeconds) === "undefined") newVidCheckIntervalInSeconds = 120;
	if (typeof(inputDataFilePath) === "undefined") {
		dataFilePath = "./ytNotifsData.json";
	} else {
		dataFilePath = inputDataFilePath;
	};
	if (typeof(inputPreventDuplicateSubscriptions) === "undefined") {
		preventDuplicateSubscriptions = true;
	} else {
		preventDuplicateSubscriptions = inputPreventDuplicateSubscriptions;
	};
	if (typeof(dataFileAutoSaveIntervalInSeconds) === "undefined") dataFileAutoSaveIntervalInSeconds = 60;
	if (inputDebugModeEnabled) debugModeEnabled = true;
	if (dataFileAutoSaveIntervalInSeconds !== 0) {
		setInterval(() => {
			if (saveFile) {
				saveFile = false;
				log("Attempting to save data file (reason: auto save interval)...", 3);
				fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
					if (err) return log(err, 2);
					log("Data file saved", 3);
				});
			} else {
				log("Data file not saved this time in auto save interval as saveFile bool is false", 3);
			};
		}, dataFileAutoSaveIntervalInSeconds * 1000);
	};
	fs.stat(dataFilePath, (err, stat) => {
		if (err && err.code === "ENOENT") {
			log("Data file does not exist, attempting to create...", 3);
			fs.promises.mkdir(path.dirname(dataFilePath), { recursive: true })
				.then(() => {
					fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
						if (err) return log(err, 2);
						log("Data file created", 3);
					});
				});
		} else {
			if (err) return log(err, 2);
			log("Data file already exists, attempting to read file...", 3);
			fs.readFile(dataFilePath, (err, fileData) => {
				if (err) return log(err, 2);
				log("Data file has been read", 3);
				data = JSON.parse(fileData.toString());
				channels = channels.concat(data.permanentSubscriptions);
			});
		};
	});
	setInterval(() => {
		channels.forEach(element => {
			log("Doing new vid check for channel " + element + "...", 3);
			axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + element)
				.then((res) => {
					parseXml(res.data, (err, parsed) => {
						if (err) return log(err, 2);
						if (!parsed.feed.entry || parsed.feed.entry.length < 1) return;
						if (!data.latestVids[element]) return data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
						for (i in parsed.feed.entry) {
							if (parsed.feed.entry[i]["yt:videoId"][0] === data.latestVids[element]) break;
							const obj = {
								vidName: parsed.feed.entry[i].title[0],
								vidUrl: parsed.feed.entry[i].link[0].$.href,
								vidDescription: parsed.feed.entry[i]["media:group"][0]["media:description"][0],
								vidId: parsed.feed.entry[i]["yt:videoId"][0],
								vidWidth: parseInt(parsed.feed.entry[i]["media:group"][0]["media:content"][0].$.width),
								vidHeight: parseInt(parsed.feed.entry[i]["media:group"][0]["media:content"][0].$.height),
								vidThumbnailUrl: parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.url,
								vidThumbnailWidth: parseInt(parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.width),
								vidThumbnailHeight: parseInt(parsed.feed.entry[i]["media:group"][0]["media:thumbnail"][0].$.height),
								channelName: parsed.feed.title[0],
								channelUrl: parsed.feed.entry[i].author[0].uri[0],
								channelId: parsed.feed["yt:channelId"][0]
							};
							events.emit("newVid", obj);
						};
						data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
						data.channelNames[element] = parsed.feed.title[0];
						log("New vid check for channel " + element + " complete", 3);
					});
				})
				.catch((err) => {
					log(err, 2);
				});
		});
	}, newVidCheckIntervalInSeconds * 1000);
};

function saveDataFile() {
	log("Attempting to save data file (reason: saveDataFile function ran)...", 3);
	fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
		if (err) return log(err, 2);
		log("Data file saved", 3);
	});
};

function subscribe(channelIds) {
	log("subscribe function ran", 3);
	for (i in channelIds) {
		if (channels.includes(channelIds[i])) {
			log("Channel " + channelIds[i] + " was not subscribed to because it already is subscribed to!", 1);
			continue;
		};
		channels.push(channelIds[i]);
	};
};

function msg(text, obj) {
	log("msg function ran", 3);
	return text
		.replaceAll("{vidName}", obj.vidName)
		.replaceAll("{vidUrl}", obj.vidUrl)
		.replaceAll("{vidDescription}", obj.vidDescription)
		.replaceAll("{vidId}", obj.vidId)
		.replaceAll("{vidWidth}", obj.vidWidth)
		.replaceAll("{vidHeight}", obj.vidHeight)
		.replaceAll("{vidThumbnailUrl}", obj.vidThumbnailUrl)
		.replaceAll("{vidThumbnailWidth}", obj.vidThumbnailWidth)
		.replaceAll("{vidThumbnailHeight}", obj.vidThumbnailHeight)
		.replaceAll("{channelName}", obj.channelName)
		.replaceAll("{channelUrl}", obj.channelUrl)
		.replaceAll("{channelId}", obj.channelId);
};

function getSubscriptions() {
	log("getSubscriptions function ran", 3);
	return channels;
};

function unsubscribe(channelIds) {
	log("unsubscribe function ran", 3);
	channelIds.forEach(element => {
		channels.splice(channels.indexOf(element), 1);
	});
};

function getChannelName(channelId) {
	log("getChannelName function ran", 3);
	return data.channelNames[channelId];
};

function permanentSubscribe(channelIds) {
	log("permanentSubscribe function ran", 3);
	setTimeout(() => {
		subscribe(channelIds);
		for (i in channelIds) {
			if (data.permanentSubscriptions.includes(channelIds[i])) {
				log("Channel " + channelIds[i] + " was not permanently subscribed to because it already is permanently subscribed to!", 1);
				continue;
			};
			data.permanentSubscriptions.push(channelIds[i]);
		};
		saveFile = true;
	}, 100);
};

function permanentUnsubscribe(channelIds) {
	log("permanentUnsubscribe function ran", 3);
	setTimeout(() => {
		unsubscribe(channelIds);
		channelIds.forEach(element => {
			data.permanentSubscriptions.splice(data.permanentSubscriptions.indexOf(element), 1);
		});
		saveFile = true;
	}, 100);
};

function delChannelsData(channelIds) {
	log("delChannelsData function ran", 3);
	permanentUnsubscribe(channelIds);
	channelIds.forEach(element => {
		delete data.latestVids[element];
		delete data.channelNames[element];
	});
	saveFile = true;
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
	saveDataFile,
	events
};

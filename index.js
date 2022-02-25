const fs = require("fs");
const axios = require("axios");
const parseXml = require("xml2js").parseString;
const EventEmitter = require("events");
const events = new EventEmitter();
const path = require("path");

let debugModeEnabled = false;
let dataFilePath;
let preventDuplicateSubscriptions;
let channels = [];
let data = {
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

function saveDataFile() {
	log("Attempting to save data file...", 3);
	fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
		if (err) return log(err, 2);
		log("Data file saved", 3);
	});
};

function start(newVidCheckIntervalInSeconds, inputDataFilePath, inputDebugModeEnabled) {
	if (typeof (newVidCheckIntervalInSeconds) === "undefined") newVidCheckIntervalInSeconds = 120;
	if (typeof (inputDataFilePath) === "undefined") {
		dataFilePath = "./ytNotifsData.json";
	} else {
		dataFilePath = inputDataFilePath;
	};
	if (inputDebugModeEnabled) debugModeEnabled = true;
	log("start function ran. Args:\t" + newVidCheckIntervalInSeconds + "\t" + inputDataFilePath + "\t" + inputDebugModeEnabled, 3);
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
				log("Data file has been read. Data:\t" + fileData, 3);
				data = JSON.parse(fileData.toString());
				channels = channels.concat(data.permanentSubscriptions);
			});
		};
	});
	let newVids = [];
	let saveFile = false;
	setInterval(() => {
		channels.forEach(element => {
			log("Doing new vid check for channel " + element + "...", 3);
			axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + element)
				.then((res) => {
					parseXml(res.data, (err, parsed) => {
						if (err) return log(err, 2);
						if (!parsed.feed.entry || parsed.feed.entry.length < 1) return log("New vid check for channel " + element + " complete (no vids on channel)", 3);
						if (!data.latestVids[element]) {
							log("New vid check for channel " + element + " complete (channel is not key in data.latestVids)", 3);
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
							log("newVid event emitted. Vid ID: " + obj.vid.id, 3);
						});
						data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
						data.channelNames[element] = parsed.feed.title[0];
						log("New vid check for channel " + element + " complete (feed entries scanned)", 3);
					});
				})
				.catch((err) => {
					log(err, 2);
				});
		});
		if (saveFile) {
			saveFile = false;
			saveDataFile();
		};
	}, newVidCheckIntervalInSeconds * 1000);
};

function subscribe(channelIds) {
	log("subscribe function ran. Args:\t" + JSON.stringify(channelIds), 3);
	for (i in channelIds) {
		if (channels.includes(channelIds[i])) {
			log("Channel " + channelIds[i] + " was not subscribed to because it already is subscribed to!", 1);
			continue;
		};
		channels.push(channelIds[i]);
	};
};

function msg(text, obj) {
	log("msg function ran. Args:\t" + text + "\t" + JSON.stringify(obj), 3);
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
	log("getSubscriptions function ran", 3);
	return channels;
};

function unsubscribe(channelIds) {
	log("unsubscribe function ran. Args:\t" + JSON.stringify(channelIds), 3);
	channelIds.forEach(element => {
		channels.splice(channels.indexOf(element), 1);
	});
};

function getChannelName(channelId) {
	log("getChannelName function ran. Args:\t" + channelId, 3);
	return data.channelNames[channelId];
};

function permanentSubscribe(channelIds) {
	log("permanentSubscribe function ran. Args:\t" + JSON.stringify(channelIds), 3);
	setTimeout(() => {
		subscribe(channelIds);
		for (i in channelIds) {
			if (data.permanentSubscriptions.includes(channelIds[i])) {
				log("Channel " + channelIds[i] + " was not permanently subscribed to because it already is permanently subscribed to!", 1);
				continue;
			};
			data.permanentSubscriptions.push(channelIds[i]);
		};
		saveDataFile();
	}, 100);
};

function permanentUnsubscribe(channelIds) {
	log("permanentUnsubscribe function ran. Args:\t" + JSON.stringify(channelIds), 3);
	setTimeout(() => {
		unsubscribe(channelIds);
		channelIds.forEach(element => {
			data.permanentSubscriptions.splice(data.permanentSubscriptions.indexOf(element), 1);
		});
		saveDataFile();
	}, 100);
};

function delChannelsData(channelIds) {
	log("delChannelsData function ran. Args:" + JSON.stringify(channelIds), 3);
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

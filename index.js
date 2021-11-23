const fs = require("fs");
const axios = require("axios");
const parseXml = require("xml2js").parseString;
const EventEmitter = require("events");
const events = new EventEmitter();

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
    };
};

function start(newVidCheckIntervalInSeconds, dataFilePath) {
    if (!newVidCheckIntervalInSeconds) newVidCheckIntervalInSeconds = 120;
    if (!dataFilePath) dataFilePath = "./ytNotifsData.json";
    fs.stat(dataFilePath, (err, stat) => {
        if (err && err.code === "ENOENT") {
            fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
                if (err) return log(err, 2);
                fs.readFile(dataFilePath, (err, fileData) => {
                    if (err) return log(err, 2);
                    data = JSON.parse(fileData.toString());
                    channels = channels.concat(data.permanentSubscriptions);
                });
            });
        } else {
            if (err) return log(err, 2);
            fs.readFile(dataFilePath, (err, fileData) => {
                if (err) return log(err, 2);
                data = JSON.parse(fileData.toString());
                channels = channels.concat(data.permanentSubscriptions);
            });
        };
    });
    setInterval(() => {
        channels.forEach(element => {
            axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + element)
                .then((res) => {
                    parseXml(res.data, (err, parsed) => {
                        if (err) return log(err, 2);
                        if (!parsed.feed.entry || parsed.feed.entry.length < 1) return;
                        if (parsed.feed.entry[0]["yt:videoId"][0] !== data.latestVids[element]) {
                            if (!data.latestVids[element]) return data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
                            data.latestVids[element] = parsed.feed.entry[0]["yt:videoId"][0];
                            data.channelNames[element] = parsed.feed.title[0];
                            fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
                                if (err) return log(err, 2);
                            });
                            const obj = {
                                vidName: parsed.feed.entry[0].title[0],
                                vidUrl: parsed.feed.entry[0].link[0].$.href,
                                vidDescription: parsed.feed.entry[0]["media:group"][0]["media:description"][0],
                                vidId: parsed.feed.entry[0]["yt:videoId"][0],
                                vidWidth: parseInt(parsed.feed.entry[0]["media:group"][0]["media:content"][0].$.width),
                                vidHeight: parseInt(parsed.feed.entry[0]["media:group"][0]["media:content"][0].$.height),
                                vidThumbnailUrl: parsed.feed.entry[0]["media:group"][0]["media:thumbnail"][0].$.url,
                                vidThumbnailWidth: parseInt(parsed.feed.entry[0]["media:group"][0]["media:thumbnail"][0].$.width),
                                vidThumbnailHeight: parseInt(parsed.feed.entry[0]["media:group"][0]["media:thumbnail"][0].$.height),
                                channelName: parsed.feed.title[0],
                                channelUrl: parsed.feed.entry[0].author[0].uri[0],
                                channelId: parsed.feed["yt:channelId"][0]
                            };
                            events.emit("newVid", obj);
                        };
                    });
                })
                .catch((err) => {
                    log(err, 2);
                });
        });
    }, newVidCheckIntervalInSeconds * 1000);
};

function subscribe(channelIds) {
    channels = channels.concat(channelIds);
};

function msg(text, obj) {
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
    return channels;
};

function unsubscribe(channelIds) {
    channelIds.forEach(element => {
        channels.splice(channels.indexOf(element), 1);
    });
};

function getChannelName(channelId) {
    return data.channelNames[channelId];
};

function permanentSubscribe(channelIds) {
    subscribe(channelIds);
    data.permanentSubscriptions.concat(channelIds);
    fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
        if (err) return log(err, 2);
    });
};

function permanentUnsubscribe(channelIds) {
    unsubscribe(channelIds);
    channelIds.forEach(element => {
        data.permanentSubscriptions.splice(data.permanentSubscriptions.indexOf(element), 1);
    });
    fs.writeFile(dataFilePath, JSON.stringify(data), (err) => {
        if (err) return log(err, 2);
    });
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
    events
};

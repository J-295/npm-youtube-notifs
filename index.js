const fs = require("fs");
const axios = require("axios");
const xml2js = require("xml2js");
const events = require("events");
const eventEmitter = new events.EventEmitter();
const dataFile = "./latestVid.json";
const dataFileFs = "./node_modules/youtube-notifs/latestVid.json";

function getLatestVidObj() {
    const latestVid = require(dataFile);
    return {
        vidName: latestVid.title[0],
        vidDescription: latestVid["media:group"][0]["media:description"][0],
        vidThumbnailUrl: latestVid["media:group"][0]["media:thumbnail"][0].$.url,
        vidUrl: latestVid.link[0].$.href,
        channelName: latestVid.author[0].name[0],
        channelUrl: latestVid.author[0].uri[0]
    };
};

function subscribe(channelId, newVidCheckIntervalInSeconds) {
    eventEmitter.on("dataFileExists", () => {
        var dataFileParsed;
        setInterval(() => {
            fs.readFile(dataFileFs, 'utf8', function (err, data) {
                dataFileParsed = JSON.parse(data);
            });
            axios.get("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId)
                .then(function (response) {
                    xml2js.parseString(response.data, { trim: true }, function (err, parsedResponse) {
                        if (!dataFileParsed.id || dataFileParsed.id[0] !== parsedResponse.feed.entry[0].id[0]) {
                            fs.writeFile(dataFileFs, JSON.stringify(parsedResponse.feed.entry[0]), err => {
                                if (err) return console.log("yt-notifs had an error writing to file \"" + dataFile + "\": " + err);
                            });
                            setTimeout(() => eventEmitter.emit("newVid"), 250);
                        };
                    });
                })
                .catch(function (err) {
                    console.log("yt-notifs had an error: " + err);
                });
        }, newVidCheckIntervalInSeconds * 1000);
    });
    fs.open(dataFileFs, 'r', function (err) {
        if (err) {
            fs.writeFile(dataFileFs, "{}", function (err) {
                if (err) return console.log("yt-notifs had an error creating the file\"" + dataFile + "\": " + err);
                eventEmitter.emit("dataFileExists");
            });
        } else {
            eventEmitter.emit("dataFileExists");
        };
    });
};

function msg(message) {
    const latestVidObj = getLatestVidObj();
    return message
        .replaceAll("{vidName}", latestVidObj.vidName)
        .replaceAll("{vidDescription}", latestVidObj.vidDescription)
        .replaceAll("{vidThumbnailUrl}", latestVidObj.vidThumbnailUrl)
        .replaceAll("{vidUrl}", latestVidObj.vidUrl)
        .replaceAll("{channelName}", latestVidObj.channelName)
        .replaceAll("{channelUrl}", latestVidObj.channelUrl);
};

module.exports = { eventEmitter, getLatestVidObj, subscribe, msg };

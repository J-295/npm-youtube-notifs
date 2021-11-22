Get a notification when certain youtube channels upload a new video!
```js
/*
 * Example One
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start(60, "./youtubeNotifsData.json"); // args: new video check interval in seconds, data file path
ytNotifs.events.on("newVid", (obj) => { // obj is an object containing video info
    console.log(ytNotifs.msg("{channelName} just uploaded a new video!\n{vidUrl}", obj));
    /*
     * other placeholders that can be used with ytNotifs.msg():
     *   {vidName}
     *   {vidUrl}
     *   {vidDescription}
     *   {vidId}
     *   {vidWidth}
     *   {vidHeight}
     *   {vidThumbnailUrl}
     *   {vidThumbnailWidth}
     *   {vidThumbnailHeight}
     *   {channelName}
     *   {channelUrl}
     *   {channelId}
     */
});
ytNotifs.subscribe("UC7bD_GEqdgUDCe_cyVa6Y2g"); // args: channel id
```
```js
/*
 * Example Two
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start(); // defaults will be used: 120, "./ytNotifsData.json"
ytNotifs.events.on("newVid", (obj) => {
    console.log(obj.channelName + " just uploaded a new video!\n" + obj.vidUrl);
});
ytNotifs.subscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g", "UCS0N5baNlQWJCUrhCEo8WlA"]); // an array can be used to subscribe to multiple channels at the same time
```
```js
/*
 * Example Three (uses https://www.npmjs.com/package/discord.js)
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start();
ytNotifs.events.on("newVid", (obj) => {
    var discordChannelId;
    switch (obj.vidId) {
        case "UC7bD_GEqdgUDCe_cyVa6Y2g":
            discordChannelId = "521539885237272586";
            break;
        case "UCS0N5baNlQWJCUrhCEo8WlA":
            discordChannelId = "804050388680310784";
            break;
    };
    client.channels.get(discordChannelId).send(ytNotifs.msg("{channelName} just uploaded a new video!\n{vidUrl}", obj));
});
ytNotifs.subscribe("UC7bD_GEqdgUDCe_cyVa6Y2g");
ytNotifs.subscribe("UCS0N5baNlQWJCUrhCEo8WlA"); // you don't need to subscribe to all channels at the same time
```
Have any issues or questions? Open a Github issue [here](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

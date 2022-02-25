Get a notification when certain youtube channels upload a new video!
```js
/*
 * Example One
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start(60, "./youtubeNotifsData.json", false); // args: new video check interval in seconds, data file path, debug mode enabled
ytNotifs.events.on("newVid", (obj) => { // obj is an object containing video info
    console.log(ytNotifs.msg("{channelName} just uploaded a new video!\n{vidUrl}", obj));
    /*
     * all placeholders that can be used with ytNotifs.msg()
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
ytNotifs.subscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g"]); // args: channel id
```
```js
/*
 * Example Two
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start(); // defaults will be used: 120, "./ytNotifsData.json", true, 60, false
ytNotifs.events.on("newVid", (obj) => {
    console.log(obj.channel.name + " just uploaded a new video!\n" + obj.vid.url);
});
ytNotifs.subscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g", "UCS0N5baNlQWJCUrhCEo8WlA"]); // multiple channels can be subscribed to
```
```js
/*
 * Example Three (uses https://www.npmjs.com/package/discord.js)
 */
const ytNotifs = require("youtube-notifs");
ytNotifs.start();
ytNotifs.events.on("newVid", (obj) => {
    let discordChannelId;
    switch (obj.vid.id) {
        case "UC7bD_GEqdgUDCe_cyVa6Y2g":
            discordChannelId = "521539885237272586";
            break;
        case "UCS0N5baNlQWJCUrhCEo8WlA":
            discordChannelId = "804050388680310784";
            break;
    };
    client.channels.get(discordChannelId).send(ytNotifs.msg("{channelName} just uploaded a new video!\n{vidUrl}", obj));
});
ytNotifs.subscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g"]);
ytNotifs.subscribe(["UCS0N5baNlQWJCUrhCEo8WlA"]); // you don't need to subscribe to all channels at the same time
```
```js
/*
 * Examples of Other functions
 */
console.log("Current subscriptions: " + ytNotifs.getSubscriptions().join(", ")); // returns an array of channels which are subscribed to
ytNotifs.unsubscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g"]); // this functions lets you unsubscribe from an array of channels
console.log("Name of channel: " + ytNotifs.getChannelName("UC7bD_GEqdgUDCe_cyVa6Y2g")); // get the name of a channel from its ID
ytNotifs.permanentSubscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g"]); // permanently subscribe to an array of channels
ytNotifs.permanentUnsubscribe(["UC7bD_GEqdgUDCe_cyVa6Y2g"]); // permanently unsubscribe from an array of channels
ytNotifs.delChannelsData(["UCBa659QWEk1AI4Tg--mrJ2A"]); // permanently unsubscribe from an array of channels and delete all data about those channels
```
Have any issues, questions or suggestions? [Join my Discord server](https://discord.com/invite/dcAwVFj2Pf) or [open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

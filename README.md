```js
const ytNotifs = require("youtube-notifs");

ytNotifs.eventEmitter.on("newVid", () => {
    console.log(ytNotifs.msg("{channelName} just uploaded a new video called {vidName}!")); // the msg() function will translate the following: {channelName} {vidName} {vidDescription} {vidThumbnailUrl} {vidUrl} {channelName} {channelUrl}
    console.log(JSON.stringify(ytNotifs.getLatestVidObj())); // use the getLatestVidObj() function to get an object with the video's name, URL, description, thumbnail URL, channel name and channel URL
});

ytNotifs.subscribe("UCS0N5baNlQWJCUrhCEo8WlA", 120); // Args: Youtube Channel ID, seconds between checking for a new video
```

Note that it will say a new video has been uploaded when you first install this and when if you delete the node_modules/ directory

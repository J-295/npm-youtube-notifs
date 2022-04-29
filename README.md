Get notified when Youtube videos are uploaded!


<b><u>This package is only compatible with the ECMAScript standard of JavaScript.<br>
If you don't use that, you can use the [yt-notifs](https://www.npmjs.com/package/yt-notifs) package instead.</u></b>
<br><br>

```js
/*
 * Example
 */

import ytNotifs from "youtube-notifs";

// Args: data file name, new video check interval (seconds)
const notifier = new ytNotifs.Notifier("./yt-notifs-data.json", 120);

notifier.on("error", (err) => {
	console.error(err);
});

notifier.on("newVid", (obj) => {
	console.log(
		ytNotifs.msg("{channelName} uploaded a new video!\n{vidUrl}", obj)
	);
});

/*
 * Channel ID or array of channel IDs to subscribe to,
 * this function can be ran at any time. There is also an "unsubscribe" function
 */
notifier.subscribe("UC9-y-6csu5WGm29I7JiwpnA");

/*
 * Start checking for uploads.
 * There is also a "stop" function
 */
notifier.start();
```

Have any issues, questions or suggestions? [Join my Discord server](https://discord.com/invite/dcAwVFj2Pf) or [open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

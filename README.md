Receive events from youtube video uploads!

**Typescript example**
```ts
import { Notifier, Video } from "youtube-notifs";

// Args: new video check interval in seconds, data file path
const notifier = new Notifier(60*60, "./ytNotifsData.json");

notifier.onError = console.error;

notifier.onNewVideo = (video: Video) => {
	console.dir(video);
}

// Takes a string or an array of channel IDs.
// There is also an unsubscribe function
notifier.subscribe("UCr9mtUZ7V3QfzGKleu_3CDw");

// Start checking for new videos.
// There is also a stop function
notifier.start();
```

**Javascript example**
```js
const { Notifier } = require("youtube-notifs");

// Args: new video check interval in seconds, data file path
const notifier = new Notifier(60*60, "./ytNotifsData.json");

notifier.onError = console.error;

notifier.onNewVideo = (video) => {
	console.dir(video);
}

// Takes a string or an array of channel IDs.
// There is also an unsubscribe function
notifier.subscribe("UCr9mtUZ7V3QfzGKleu_3CDw");

// Start checking for new videos.
// There is also a stop function
notifier.start();
```

Have any issues, questions or suggestions? [Join my Discord server](https://discord.com/invite/dcAwVFj2Pf) or [open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

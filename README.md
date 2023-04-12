Receive events from youtube video uploads!

**Typescript example**
```ts
import { Notifier, Video, SubscriptionMethods, DataStorageMethods } from "youtube-notifs";

const notifier = new Notifier({
	subscription: {
		method: SubscriptionMethods.Polling,
		interval: 15
	},
	dataStorage: {
		method: DataStorageMethods.File,
		file: "./ytNotifsData.json"
	}
});

notifier.onError = console.error;

notifier.onNewVideo = (video: Video) => {
	console.dir(video);
}

// Takes any amount of channel IDs,
//   spread syntax can be used to subscribe to an array of channels.
// There is also an unsubscribe function
notifier.subscribe("UCr9mtUZ7V3QfzGKleu_3CDw");

// Start checking for new videos.
// There is also a stop function
notifier.start();
```

A bot for Youtube notifications on Discord using this package can be found [here](https://github.com/James-Bennett-295/youtube_notifications_bot).

Have any issues, questions, or suggestions? [Join my Discord server](https://discord.com/invite/dcAwVFj2Pf) or [open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

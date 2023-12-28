Receive events from YouTube video uploads!

**Typescript example**
```ts
import { Notifier, SubscriptionMethods, DataStorageMethods } from "youtube-notifs";

const notifier = new Notifier({
	subscription: {
		// Currently, the only available method is Polling:
		method: SubscriptionMethods.Polling,
		// The number of minutes between checking for new videos:
		interval: 15
	},
	// If no dataStorage info is provided, videos uploaded between the last Notifier being stopped
	//   and the current Notifier being started will not be recieved.
	dataStorage: {
		// Currently, the only available method is File:
		method: DataStorageMethods.File,
		file: "./ytNotifsData.json"
	}
});

// Errors will be thrown if no error listener is set.
notifier.onError = console.error;

// Polling can mean multiple new videos are detected at the same time.

// This will recieve all detected videos at once:
notifier.onNewVideos = (videos) => {
	console.dir(videos);
}
// This will recieve all detected videos individually:
notifier.onNewVideo = (video) => {
	console.dir(video);
}

// Takes any amount of channel IDs,
//   spread syntax can be used to subscribe to an array of channels.
// There is also an unsubscribe function.
notifier.subscribe("UCS0N5baNlQWJCUrhCEo8WlA");

// Start checking for new videos.
// There is also a stop function.
notifier.start();
```

A program for receiving YouTube notifications on Discord using this package can be found [here](https://github.com/James-Bennett-295/youtube-webhook).

Have any issues, questions, or suggestions? [Open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

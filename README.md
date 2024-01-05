Receive events from YouTube video uploads!

**TypeScript example**
```ts
import { PollingNotifier, JsonStorage } from "youtube-notifs";

const notifier = new PollingNotifier({
    interval: 15,
    storage: new JsonStorage("youtube-notifs.json")
});

notifier.onNewVideos = (videos) => {
    for (const video of videos) {
        console.dir(video);
    }
}

notifier.subscribe("UCS0N5baNlQWJCUrhCEo8WlA");

notifier.start();
```

A program for receiving YouTube notifications on Discord using this package can be found [here](https://github.com/James-Bennett-295/youtube-webhook).

Have any issues, questions, or suggestions? [Open a Github issue](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

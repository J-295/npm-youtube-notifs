Receive events from YouTube video uploads!

**View the documentation [here](https://github.com/James-Bennett-295/npm-youtube-notifs/wiki).**

Have any issues, questions, or suggestions? [Open an issue on GitHub](https://github.com/James-Bennett-295/npm-youtube-notifs/issues/new).

**TypeScript example:**
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

If using JavaScript, just replace the import line with the following:
```js
const { PollingNotifier, JsonStorage } = require("youtube-notifs");
```

A program for receiving YouTube notifications on Discord using this package can be found [here](https://github.com/James-Bennett-295/youtube-webhook).

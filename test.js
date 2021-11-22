const ytNotifs = require("./index.js");

ytNotifs.start(5, "./ytNotifsData.json");
ytNotifs.events.on("newVid", (obj) => {
    console.log(ytNotifs.msg("{channelName} just uploaded a new video!\n{vidUrl}", obj));
});
ytNotifs.subscribe("UCnsbQM9ZgyCvYdHVRlRr8dg");

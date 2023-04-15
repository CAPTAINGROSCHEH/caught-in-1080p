# caught in 1080p
 Discord bot Youtube stream clipper, inspired from https://odieldomanie.github.io/callipper/
 
 While this project is name caught in 1080p, this bot only records in 720p lmao
 
 
 # Configuration
Create a `config.json` file, and enter those information :

```json
{
    "token": "Your bot's Token",
    "clientId": "Your bot's client ID"
}
```

(Temporary lmao please help) to be able to use the / commands, register them by launching `deploy-commands.js` after setting up `config.json`

And now you can finally clip with your bot!

# Warning
To clip a stream, this bot needs to start recording it to be able to clip it, which means that during the clipping process, the bot will have to save the entire recording in an unencoded file and in an encoded file. So it is important to **not let the recording last for a really long time if you don't have enough memory available on your computer/server**.

I still haven't covered the case where you set a video/vod as a stream to record, so you may encounter issues by doing this so please only try to set up streams.

This is still a beta version of the bot, some unexpected errors can happen and crash the bot, be careful while using it!

# How to use it
### Commands
You can use those commands :

* `stream` - To set up a stream to record, the record will start right when you set up the stream.
* `stop` - To stop recording a stream. The recording that will be done before you use that command will be lost.
* `record` - To start recording a stream in case you used `/stop`.
* `reset` - To reset a recording, this will avoid to encode a heavy video file to clip, the recording that will be done before you use that command will be lost.
* `c` - To clip the on going recording, it's required to set `seconds_ago` to set from when you want to clip, `duration` is optional, it will clip until the end of the recording if you don't input a duration. You can input decimals for `seconds_ago` and `duration`, the output will give you information about the clip and the recording to help you reclipping it in case you're didn't catch the moment you wanted!
* `reclip` - Does the same as `/c` but clips from the latest recording you encoded with `/c`, this should be used to make a better clip in case you're not satisfied with the last one you did.

### More (idk)
When you'll get messages with a reset button telling you that it had been 2 minutes since you started recording, this will help you to not forget to reset the stream!
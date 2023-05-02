# caught in 1080p
 Discord bot Youtube stream clipper, inspired from https://odieldomanie.github.io/callipper/
 
 
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

The recording in 1080p with `record1080p` is still a prototype, so you have to start it manually, if it doesn't work, use the regular `record` command to record in 720p.

This is still a beta version of the bot, some unexpected errors can happen and crash the bot, be careful while using it!

# How to use it
### Commands
You can use those commands :

* `settings` - To set up the time **in seconds** the bot needs to wait to send a warning about the recording's length (with `warningtime`) and to automatically reset (with `autoresettime`). By default the warning time would be 2 minutes and the autoreset time would be 4 minutes. I suggest to set the autoreset time shorter than 4 minutes.
* `stream` - To set up a stream to record, the record will start right when you set up the stream (on 720p by default).
* `stop` - To stop recording a stream. The recording that will be done before you use that command will be lost.
* `record` - To start recording a stream in case you used `/stop`.
* `record1080p` - To start recording a stream in 1080p. This is a separate command in case it doesn't work since it's still a prototype.
* `reset` - To reset a recording, this will avoid to encode a heavy video file to clip, the recording that will be done before you use that command will be lost.
* `c` / `a` - To clip the on going recording, it's required to set `seconds_ago` to set from when you want to clip, `duration` is optional, it will clip until the end of the recording if you don't input a duration. You can input decimals for `seconds_ago` and `duration`, the output will give you information about the clip and the recording to help you reclipping it in case you're didn't catch the moment you wanted! Also does audio clip with `a`
* `reclip` / `reclipaudio` - Does the same as `/c` but clips from the latest recording you encoded with `/c`, this should be used to make a better clip in case you're not satisfied with the last one you did. Also does audio clip with `reclipaudio`. Since the first render will be a video no matter if you use `c` or `a`, you can use `reclipaudio` even if you used `c` first, same thing with `reclip` and `a` 
* `channel` - To set up a channel where the bot will send the clips you'll save thanks to the save button below every clips.


### More (idk)
When you'll get messages with a reset button telling you that it had been 2 minutes since you started recording, this will help you to not forget to reset the stream!
const discord = require("discord.js")
const { token, guildId } = require('./config.json');
const { ActivityType, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const axios = require('axios');
const fs = require('fs');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { ButtonBuilder } = require("@discordjs/builders");
const { time } = require("console");

const client = new discord.Client({
    intents: [
        "Guilds",
        "GuildMessages",
        "MessageContent",
        "GuildVoiceStates",
        "GuildMembers",
        "DirectMessages",
        "GuildPresences"
    ]
})

client.once('ready', async () => {
	console.log(`We clippin! ${client.user.tag}.`);
    client.user.setPresence({
        activities: [{name: "Clipping", type: ActivityType.Playing}],
        status: "dnd",
    })
    
});

async function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms));
}

async function ReadSettings(guildId){
    let settings;

     fs.readFile("./settings/settings_" + guildId + ".json", "utf8", async (err, jsonString) => {
        if (err) {
          console.log("Error while reading settings.json : ", err);
          settings = {}
          return settings;
        }
        try {
          settings = JSON.parse(jsonString);
        } catch (err) {
          console.log("Error parsing JSON string:", err);
        }
        
    });

    await sleep(100) //send help

    return settings;
}

async function SecondsToString(seconds){
    let string;
    if(seconds>=0 && seconds<60){
        string = seconds + "s"
    }else if (seconds>=60 && seconds<3600){
        string = Math.floor(seconds % 3600 / 60) + "m" + Math.floor(seconds % 60) + "s"
    }else if(seconds>=3600 && seconds<86400){
        string = Math.floor(seconds % (3600*24) / 3600) + "h" + Math.floor(seconds % 3600 / 60) + "m" + Math.floor(seconds % 60) + "s"
    }else if(seconds>=86400){
        string = Math.floor(seconds / (3600*24)) + "d" + Math.floor(seconds % (3600*24) / 3600) + "h" + Math.floor(seconds % 3600 / 60) + "m" + Math.floor(seconds % 60) + "s"
    }

    return string;
}

async function GetStreamStartTime(url){
    await axios.get('https://holodex.net/api/v2/live?id=' + url, {
        headers: {
          "X-APIKEY": "a80e8260-d572-4365-aace-435a3107c069"
        }
      })
    .then(async (res) => {
        timestamp = Math.floor(Date.now() / 1000) - new Date(res.data[0].start_actual).getTime() / 1000
    })

    return timestamp
}


function WriteSettings(interaction, settings){
    if(!fs.existsSync('./settings')){
        fs.mkdirSync('./settings')
    }

    fs.writeFile('./settings/settings_' + interaction.guildId + '.json', JSON.stringify(settings, null, 2), 'utf8', (err) => {
        if(err) interaction.channel.send({content: "There has been an error while setting up the channel", ephemeral: true})

    });
}


let VIDEO_URL = '';

let timestamp = 0 ;

const args1 = [
    '-i', 'video.mp4', // Input file
    '-y', //force overwrite
    '-c:v', 'libx264', // Video codec
    '-preset', 'ultrafast', // Encoding speed
    '-crf', '23', // Constant rate factor (quality)
    '-c:a', 'copy', // Audio codec (copy from input)
    'render.mp4' // Output file
  ];

const argsA = [
    '-i', 'video.mp4', // Input file
    '-y', //force overwrite
    '-preset', 'ultrafast', // Encoding speed
    '-crf', '23', // Constant rate factor (quality)
    '-c:a', 'copy', // Audio codec (copy from input)
    'render.mp3' // Output file
  ];

const args1080p = [
    '-i', 'rendered.mp4', 
    '-i', 'audio.mp3',
    '-y',
    '-c:v', 'copy',
    '-c:v', 'copy',
    'render.mp4'
]

/*const args1080p = [
    '-i', 'video.mp4', 
    '-i', 'audio.mp3',
    '-y',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-c:a', 'aac',
    'render.mp4'
]*/

const argsExtract = [
    '-i', 'audio.mp4',
    '-y',
    '-f', 'mp3',
    '-ab', '192000',
    '-vn', // No video
    'audio.mp3'
]

const argsVideo = [
    '-i', 'video.mp4',
    '-y',
    '-b:v', '5M',
    'rendered.mp4'
]

let stream;
let clipping;
let cut;
let timestamptext;
let secondsAgo;
let clipduration;
let clipdurationtext;
let lastwarningmessage;
let lastautoresetmessage;
let recordtime;
let recordWarning;
let streamtimestamp;
let record1080p = false;
let autoreset;

async function RecordStream(url, interaction){
    let settings = await ReadSettings(interaction.guildId)

    ytdl(url)
        .on('error', async (err) => {
            console.error(err.message)
            if(err.message.startsWith('No video id found')){
                return await interaction.reply({content: 'Stream not found'})
            }
        })
        .pipe(
            stream = fs.createWriteStream('video.mp4'),
            recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>',

            clearTimeout(recordWarning),

            recordWarning = setTimeout(async function () {
                if(lastwarningmessage !== undefined){
                    await lastwarningmessage.delete()
                }
                lastwarningmessage = await interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
            }, settings.warningtime * 1000),
    
            clearTimeout(autoreset),

            autoreset = setTimeout(async function () {
                await stream.close()
                RecordStream(url, interaction)
                if(lastautoresetmessage !== undefined){
                    await lastautoresetmessage.delete()
                }
                lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
            }, settings.autoresettime * 1000),
        )
}

async function RecordStream1080p(url, interaction){
    let settings = await ReadSettings(interaction.guildId)

    ytdl(url, { quality: 'lowest'})
    .on('error', async (err) => {
        console.error(err.message)
        if(err.message.startsWith('No video id found')){
            return await interaction.reply({content: 'Stream not found'})
        }
    })
    .pipe(
        stream = fs.createWriteStream('video.mp4'),
        recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>',

        clearTimeout(recordWarning),

        recordWarning = setTimeout(async function () {
            if(lastwarningmessage !== undefined){
                await lastwarningmessage.delete()
            }
            lastwarningmessage = await interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
        }, settings.warningtime * 1000),

        clearTimeout(autoreset),

        autoreset = setTimeout(async function () {
            await stream.close()
            RecordStream1080p(url, interaction)
            if(lastautoresetmessage !== undefined){
                await lastautoresetmessage.delete()
            }
            lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
        }, settings.autoresettime * 1000)
    )
}


const btnReset = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('reset')
            .setLabel('Reset')
            .setStyle(ButtonStyle.Primary),
    )

const btnSave = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('save')
            .setLabel('Save')
            .setStyle(ButtonStyle.Success),
    )


client.on('interactionCreate', async interaction => {

    let settings = await ReadSettings(interaction.guildId)

    if(settings.warningtime === undefined){
        settings.warningtime = 120;
        WriteSettings(interaction, settings)

    }
    if(settings.autoresettime === undefined){
        settings.autoresettime = 240;
        WriteSettings(interaction, settings)

    }

    if(interaction.isModalSubmit()){
        switch(interaction.customId){
            case 'modalClipTitle':

                let clipUrl = interaction.message.attachments.first().url 
                let link = interaction.message.content.substring(interaction.message.content.indexOf("<") + 1, interaction.message.content.lastIndexOf(">"))
                let timestamp = interaction.message.content.substring(interaction.message.content.indexOf("["), interaction.message.content.indexOf(']') + 1)

                interaction.reply({content: 'Saving...', ephemeral: true})

                let channel = client.channels.cache.get(settings.channel)
                let messageSaved = await channel.send({
                    content: interaction.fields.getTextInputValue('clipTitle') + '\nTimestamp : ' + timestamp + ' <' + link + '>'
                })

                let messageClip = await channel.send({
                    files: [{
                        attachment: clipUrl,
                        name: interaction.fields.getTextInputValue('clipTitle') + clipUrl.slice(clipUrl.lastIndexOf('.'))
                    }]
                })

                interaction.editReply({content: 'Clip saved in ' + messageClip.url , ephemeral: true})

                await messageSaved.edit({
                    content: interaction.fields.getTextInputValue('clipTitle') + '\nTimestamp : ' + timestamp + ' <' + link + '>\n<' + messageClip.attachments.first().url + '>'
                })
            
            break;
        }

        return;
    }

    if(interaction.isButton()){
        switch(interaction.customId){
            case 'reset':
                if(stream === undefined){
                    return await interaction.reply({content: 'No stream set up.'})
                }
                stream.close()

                if(record1080p === true){
                    ytdl(VIDEO_URL, { quality: 'lowest'})
                    .on('error', async (err) => {
                        console.error(err.message)
                        if(err.message.startsWith('No video id found')){
                            return await interaction.reply({content: 'Stream not found'})
                        }
                    })
                    .pipe(
                        stream = fs.createWriteStream('video.mp4'),
                        recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>',

                        clearTimeout(recordWarning),

                        recordWarning = setTimeout(async function () {
                            if(lastwarningmessage !== undefined){
                                await lastwarningmessage.delete()
                            }
                            lastwarningmessage = await interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                        }, settings.warningtime * 1000),

                        clearTimeout(autoreset),

                        autoreset = setTimeout(async function () {
                            await stream.close()
                            RecordStream1080p(VIDEO_URL, interaction)
                            if(lastautoresetmessage !== undefined){
                                await lastautoresetmessage.delete()
                            }
                            lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
                        }, settings.autoresettime * 1000)
                    )
                    interaction.message.edit({content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                    interaction.reply({content: 'Recording reset!', ephemeral: true})
                }else{
                    ytdl(VIDEO_URL)
                        .on('error', async (err) => {
                            console.error(err.message)
                            if(err.message.startsWith('No video id found')){
                                return await interaction.reply({content: 'Stream not found'})
                            }
                        })
                        .pipe(
                            stream = fs.createWriteStream('video.mp4'),
                            recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>',

                            clearTimeout(recordWarning),

                            recordWarning = setTimeout(async function () {
                                if(lastwarningmessage !== undefined){
                                    await lastwarningmessage.delete()
                                }
                                lastwarningmessage = await interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                            }, settings.warningtime * 1000),

                            clearTimeout(autoreset),
                            
                            autoreset = setTimeout(async function () {
                                await stream.close()
                                RecordStream(VIDEO_URL, interaction)
                                if(lastautoresetmessage !== undefined){
                                    await lastautoresetmessage.delete()
                                }
                                lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
                            }, settings.autoresettime * 1000),
                        )
                    
                    interaction.message.edit({content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                    interaction.reply({content: 'Recording reset!', ephemeral: true})
                }
            break;
            
            case 'save':

                if(settings.channel === undefined){
                    return await interaction.reply({content: "No channel set up for saving clips, use `/channel`!", ephemeral: true})
                }

                const modalClipTitle = new ModalBuilder()
                    .setCustomId('modalClipTitle')
                    .setTitle("Your clip's title")

                const inputClipTitle = new TextInputBuilder()
                    .setCustomId('clipTitle')
                    .setLabel('Title')
                    .setPlaceholder('Enter a title or a short description!')
                    .setStyle(TextInputStyle.Short)

                const inputTitleActionRow = new ActionRowBuilder().addComponents(inputClipTitle)

                modalClipTitle.addComponents(inputTitleActionRow)


                interaction.showModal(modalClipTitle);

            break;
        }
        return;
    }

    let renderFound = true;

    switch(interaction.commandName){ 
        case 'channel':
            let channel = client.channels.cache.get(interaction.options.get('channel').value)
            if(!(channel.isTextBased())){
                return await interaction.reply({content: "You need to choose a text channel!", ephemeral: true})
            }

            settings.channel = await interaction.options.get('channel').value
            
            WriteSettings(interaction, settings)

            interaction.reply({content: "Channel set up to : <#" + settings['channel'] + ">", ephemeral: true })

        break;

        case 'c':
            if(VIDEO_URL === '' || stream === undefined){
                return await interaction.reply({content: "You can't clip ! You either need to set a stream or start the recording"})
            }
            

            await interaction.reply({content: 'Starting to clip...'})

            await stream.close()           
                
            streamtimestamp = await GetStreamStartTime(VIDEO_URL.slice(17))
                
            clipping = spawn(ffmpeg, args1)
            interaction.editReply({content: 'Encoding the recording...'})
                
            clipping.on('close', async () => {
    
                if(record1080p === true){
                    RecordStream1080p(VIDEO_URL,interaction);
                }else{
                    RecordStream(VIDEO_URL,interaction);
                }
                                    
                secondsAgo = interaction.options.get('seconds_ago').value
    
                secondsAgoText = secondsAgo.toString()
    
                if(interaction.options.get('duration') === null){
                    clipduration = await getVideoDurationInSeconds('render.mp4')
                }else{
                    clipduration = interaction.options.get('duration').value
                }
    
                timestamp = await getVideoDurationInSeconds('render.mp4') - secondsAgo;
                timestamptext = timestamp.toString()
                clipdurationtext = clipduration.toString()
                
                let args2 = [
                    '-i', 'render.mp4', // Input file
                    '-y', //force overwrite
                    '-ss', timestamptext, 
                    '-t', clipdurationtext,
                    '-b:v', '5M',
                    '-c:v', 'libx264', // Video codec
                    '-c:a', 'aac', // Audio codec (copy from input)
                    'clip.mp4' // Output file 
                  ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Trimming the recording...'})
                cut.on('close', async () => { 
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
    
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp4'], components: [btnSave]})
                            .catch(async (error) => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp4'], components: [btnSave]})
                        .catch(async (error) => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                        })
                    }
                })
            })
        
        break;

        case 'a':
            if(VIDEO_URL === '' || stream === undefined){
                return await interaction.reply({content: "You can't clip ! You either need to set a stream or start the recording"})
            }
            
            await interaction.reply({content: 'Starting to clip...'})
            await stream.close()            
            
            streamtimestamp = await GetStreamStartTime(VIDEO_URL.slice(17))

            clipping = spawn(ffmpeg, args1)
            interaction.editReply({content: 'Encoding the recording...'})
            
            clipping.on('close', async () => {

                if(record1080p === true){
                    RecordStream1080p(VIDEO_URL,interaction);
                }else{
                    RecordStream(VIDEO_URL,interaction);
                }
                                
                secondsAgo = interaction.options.get('seconds_ago').value

                secondsAgoText = secondsAgo.toString()

                if(interaction.options.get('duration') === null){
                    clipduration = await getVideoDurationInSeconds('render.mp4')
                }else{
                    clipduration = interaction.options.get('duration').value
                }

                timestamp = await getVideoDurationInSeconds('render.mp4') - secondsAgo;
                timestamptext = timestamp.toString()
                clipdurationtext = clipduration.toString()
                
                let args2 = [
                    '-i', 'render.mp4', // Input file
                    '-y', //force overwrite
                    '-ss', timestamptext, 
                    '-t', clipdurationtext,
                    '-b:a', '192K', // Audio 
                    '-vn', //idk lol
                    'clip.mp3' // Output file 
                  ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})
                cut.on('close', async () => { 
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp3'], components: [btnSave]})
                            .catch(async (error) => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp3') + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp4'], components: [btnSave]})
                        .catch(async (error) => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                        })
                    }
                })
            })
        break;

        case 'reclip':
            fs.readFile("./render.mp4", "utf8", async (err) => {
                if (err) {
                    renderFound = false;
                    return await interaction.reply({content: 'No recording found.'});
                }
            });

            if(renderFound === true){
                await interaction.reply({content: 'Starting to clip...'})
                secondsAgo = interaction.options.get('seconds_ago').value
                secondsAgoText = secondsAgo.toString()

                if(interaction.options.get('duration') === null){
                    clipduration = await getVideoDurationInSeconds('render.mp4')
                }else{
                    clipduration = interaction.options.get('duration').value
                }
    
                timestamp = await getVideoDurationInSeconds('render.mp4') - secondsAgo;
                timestamptext = timestamp.toString()
                clipdurationtext = clipduration.toString()
                
                let args2 = [
                    '-i', 'render.mp4', // Input file
                    '-y', //force overwrite
                    '-ss', timestamptext, 
                    '-t', clipdurationtext,
                    '-c:v', 'libx264', // Video codec
                    '-c:a', 'copy', // Audio codec (copy from input)
                    'clip.mp4' // Output file 
                ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})
    
                cut.on('close', async () => {
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp4'], components: [btnSave]})
                            .catch(async (error) => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp4'], components: [btnSave]})
                        .catch(async (error) => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                        })
                    }
                })
            }
        break;

        case 'reclipaudio':
            fs.readFile("./render.mp4", "utf8", async (err) => {
                if (err) {
                    renderFound = false;
                    return await interaction.reply({content: 'No recording found.'});
                }
            });

            if(renderFound === true){
                await interaction.reply({content: 'Starting to clip...'})
                secondsAgo = interaction.options.get('seconds_ago').value
                secondsAgoText = secondsAgo.toString()

                if(interaction.options.get('duration') === null){
                    clipduration = await getVideoDurationInSeconds('render.mp4')
                }else{
                    clipduration = interaction.options.get('duration').value
                }

                timestamp = await getVideoDurationInSeconds('render.mp4') - secondsAgo;
                timestamptext = timestamp.toString()
                clipdurationtext = clipduration.toString()
                
                let args2 = [
                    '-i', 'render.mp4', // Input file
                    '-y', //force overwrite
                    '-ss', timestamptext, 
                    '-t', clipdurationtext,
                    '-b:v', '5M',
                    '-b:a', '192K', // Audio 
                    '-vn', // No video
                    'clip.mp3' // Output file 
                  ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})

                cut.on('close', async () => {
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp3'], components: [btnSave]})
                            .catch(async (error) => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)", files: ['clip.mp3'], components: [btnSave]})
                        .catch(async (error) => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)\nTimestamp : [" + await SecondsToString(streamtimestamp - secondsAgo) + "](<" + VIDEO_URL + "?t=" + (streamtimestamp - secondsAgo) + ">)"})
                        })
                    }
                })
            }
        break;

        case 'record':
            if(stream === undefined){
                return await interaction.reply({content: 'No stream set up.'})
            }
            record1080p = false;
            stream.close()

            RecordStream(VIDEO_URL, interaction)

            interaction.reply({content : 'Stream set to record : ' + VIDEO_URL})
        break;

        case 'record1080p':
            if(stream === undefined){
                return await interaction.reply({content: 'No stream set up.'})
            }

            record1080p = true;
            stream.close()

            RecordStream1080p(VIDEO_URL, interaction)

            interaction.reply({content : 'Recording in 1080p now!'})
        break;

        case 'reset':
            if(VIDEO_URL === ''){
                return await interaction.reply({content: 'No stream set up.'})
            }
            stream.close()
            
            if(record1080p === true){
                RecordStream1080p(VIDEO_URL, interaction)
            }else{
                RecordStream(VIDEO_URL,interaction)
            }

            interaction.reply({content: 'Recording reset'})
        break;

        case 'settings':
            if(interaction.options.get('warningtime') === null && interaction.options.get('autoresettime') === null){
                await interaction.reply({content: 'You have to set up at least one parameter!'})
            }else{

                if(interaction.options.get('warningtime') !== null ){
                    settings.warningtime = interaction.options.get('warningtime').value
                }

                if(interaction.options.get('autoresettime') !== null){
                    settings.autoresettime = interaction.options.get('autoresettime').value
                }

                WriteSettings(interaction, settings);
                
                interaction.reply({content: 'Settings saved! Warning time is ' + settings.warningtime + ' seconds and autoreset time is ' + settings.autoresettime + ' seconds!' })
            }
        break;

        case 'stop':
            if(stream !== undefined){
                await stream.close()
                stream = '';
                clearTimeout(recordWarning)
                clearTimeout(autoreset)
                interaction.reply({content: 'Recording stopped.'})
            }else{
                interaction.reply({content: 'No on going recording'})
                
            }
        break;

        case 'postpone':
            if(stream === '' || stream === undefined){
                return await interaction.reply({content: 'No recording set up.'})
            }    

            clearTimeout(autoreset)

            let newresettime = '<t:' + (Math.floor(new Date(Date.now()).getTime() / 1000) + interaction.options.get('seconds').value) + ':R>';

            autoreset = setTimeout(async function () {
                await stream.close()
                RecordStream(VIDEO_URL, interaction)
                if(lastautoresetmessage !== undefined){
                    await lastautoresetmessage.delete()
                }
                lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
            }, interaction.options.get('seconds').value * 1000)
        
            interaction.reply({content: 'The recording will reset ' + newresettime})

        break;

        case 'stream':

            if(interaction.options.get('link').value.startsWith('https://www.youtube.com/live/')){
                let s = interaction.options.get('link').value.replace('https://www.youtube.com/live/', 'https://youtu.be/')
                VIDEO_URL = s;
            }else{
                if(interaction.options.get('link').value.startsWith('https://holodex.net/watch/')){
                    let s = interaction.options.get('link').value.replace('https://holodex.net/watch/', 'https://youtu.be/')
                    VIDEO_URL = s;
                }else{
                    VIDEO_URL = interaction.options.get('link').value;
                }
            }
            
            if(autoreset !== undefined){
                clearTimeout(autoreset);
                clearTimeout(recordWarning);
            }


            ytdl(VIDEO_URL)
                .on('error', async (err) => {
                    console.error(err.message)
                    if(err.message.startsWith('No video id found')){
                        return await interaction.reply({content: 'Stream not found'})
                    }
                })
                .pipe(
                    stream = fs.createWriteStream('video.mp4'),
                    recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>',

                    recordWarning = setTimeout(async function () {
                        if(lastwarningmessage !== undefined){
                            await lastwarningmessage.delete()
                        }
                        lastwarningmessage = await interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                    }, settings.warningtime * 1000),

                    autoreset = setTimeout(async function () {
                        await stream.close()
                        RecordStream(VIDEO_URL, interaction)
                        if(lastautoresetmessage !== undefined){
                            await lastautoresetmessage.delete()
                        }
                        lastautoresetmessage = await interaction.channel.send({content: 'Recording has been automatically reset! ' + recordtime})
                    }, settings.autoresettime * 1000),
                interaction.reply({content : 'Stream set to record : ' + VIDEO_URL})
                )
        break;
    }
});

client.login(token);

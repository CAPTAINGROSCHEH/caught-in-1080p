const discord = require("discord.js")
const { token, guildId } = require('./config.json');
const { ActivityType, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const { getVideoDurationInSeconds } = require('get-video-duration');
const { ButtonBuilder } = require("@discordjs/builders");

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

client.once('ready', () => {
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

function WriteSettings(interaction, settings){
    fs.writeFile('./settings/settings_' + interaction.guildId + '.json', JSON.stringify(settings, null, 2), 'utf8', (err) => {
        if(err)
            interaction.reply({content: "There has been an error while setting up the channel", ephemeral: true})
        else{
            interaction.reply({content: "Channel set up to : <#" + settings['channel'] + ">", ephemeral: true })
        }
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

let stream;
let clipping;
let cut;
let timestamptext;
let secondsAgo;
let clipduration;
let clipdurationtext;
let recordtime;
let recordWarning;



async function RecordStream(url, interaction){
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
            recordWarning = setTimeout(function () {
                interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
            }, 120000),
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
    

    if(interaction.isModalSubmit()){
        switch(interaction.customId){
            case 'modalClipTitle':
                settings = await ReadSettings(interaction.guildId)

                let channel = client.channels.cache.get(settings.channel)
                let messageSavedClip = await channel.send(interaction.fields.getTextInputValue('clipTitle') + '\n' + interaction.fields.getTextInputValue('clipUrl'))
                interaction.reply({content: 'Clip saved in ' + messageSavedClip.url , ephemeral: true})
            
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
                        recordWarning = setTimeout(function () {
                            interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                        }, 120000),
                    )
                
                interaction.message.edit({content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                interaction.reply({content: 'Recording reset!', ephemeral: true})
            break;
            
            case 'save':
                settings = await ReadSettings(interaction.guildId)

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

                const inputClipURL = new TextInputBuilder()
                    .setCustomId('clipUrl')
                    .setLabel("Clip's URL (DO NOT EDIT THIS)")
                    .setValue(interaction.message.attachments.first().url)
                    .setStyle(TextInputStyle.Short)

                const inputURLActionRow = new ActionRowBuilder().addComponents(inputClipURL)

                modalClipTitle.addComponents(inputTitleActionRow, inputURLActionRow)


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
            
            let settings = await ReadSettings(interaction.guildId);
            console.log(settings)

            settings.channel = await interaction.options.get('channel').value
            
            WriteSettings(interaction, settings)

        break;

        case 'c':
            if(VIDEO_URL === '' || stream === undefined){
                return await interaction.reply({content: "You can't clip ! You either need to set a stream or start the recording"})
            }
            
            await interaction.reply({content: 'Starting to clip...'})
            await stream.close()            
            clipping = spawn(ffmpeg, args1)
            interaction.editReply({content: 'Encoding the recording...'})
            
            
            clipping.on('close', async () => {

                RecordStream(VIDEO_URL,interaction);
                                
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
                    '-c:a', 'aac', // Audio codec (copy from input)
                    'clip.mp4' // Output file 
                  ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})
                cut.on('close', async () => { 
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds", files: ['clip.mp4'], components: [btnSave]})
                            .catch(error => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds", files: ['clip.mp4'], components: [btnSave]})
                        .catch(error => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
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
            clipping = spawn(ffmpeg, args1)
            interaction.editReply({content: 'Encoding the recording...'})
            
            
            clipping.on('close', async () => {

                RecordStream(VIDEO_URL,interaction);
                                
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
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds", files: ['clip.mp3'], components: [btnSave]})
                            .catch(error => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp3') + " seconds", files: ['clip.mp4'], components: [btnSave]})
                        .catch(error => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
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
                    '-c:a', 'aac', // Audio codec (copy from input)
                    'clip.mp4' // Output file 
                ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})

                cut.on('close', async () => {
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds", files: ['clip.mp4'], components: [btnSave]})
                            .catch(error => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds", files: ['clip.mp4'], components: [btnSave]})
                        .catch(error => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
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
                    '-b:a', '192K', // Audio 
                    '-vn', //idk lol
                    'clip.mp3' // Output file 
                  ];

                cut = spawn(ffmpeg, args2)
                interaction.editReply({content: 'Cutting the recording...'})

                cut.on('close', async () => {
                    await interaction.editReply({content: 'Done!'})
                    if(interaction.options.get('duration') === null){
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + clipdurationtext + " seconds. Latest recording duration : " + clipduration + " seconds", files: ['clip.mp3'], components: [btnSave]})
                            .catch(error => {
                                interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
                            })
                    }else{
                        interaction.channel.send({content: "Clipped from " + timestamptext + " to " + (timestamp + clipduration) + " seconds. Latest recording duration : " + await getVideoDurationInSeconds('render.mp4') + " seconds", files: ['clip.mp3'], components: [btnSave]})
                        .catch(error => {
                            interaction.channel.send({content: "Clip weights more than 25MB (still not able to send shiitake to a webserver)"})
                        })
                    }
                })
            }
        break;

        case 'record':
            if(stream === undefined){
                return await interaction.reply({content: 'No stream set up.'})
            }
            stream.close()

            RecordStream(VIDEO_URL,interaction)

            interaction.reply({content : 'Stream set to record : ' + VIDEO_URL})
        break;

        case 'reset':
            if(VIDEO_URL === ''){
                return await interaction.reply({content: 'No stream set up.'})
            }
            stream.close()
            
            RecordStream(VIDEO_URL,interaction)

            interaction.reply({content: 'Recording reset'})
        break;

        case 'stop':
            if(stream !== undefined){
                stream.close()
                clearTimeout(recordWarning)
                interaction.reply({content: 'Recording stopped.'})
            }else{
                interaction.reply({content: 'No on going recording'})
                
            }
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
                    recordWarning = setTimeout(function () {
                        interaction.channel.send({ content: '<@' + interaction.member.id + '> It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
                    }, 120000),
                interaction.reply({content : 'Stream set to record : ' + VIDEO_URL})
                )
                
            
        break;
        

        
    }

});

/* previous shiitake
client.on('messageCreate', async message => {
    if(message.author.bot == true){return}
    console.log(stream)
    let args = message.content.split(' ');
    let command = args[0].toLowerCase();
    try{


        switch(command){
            case 'cut':
                stream.close()
                clipping = spawn(ffmpeg, args1)
                console.log("finis!")
                
                clipping.on('close', async () => {
                    ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                    
                    recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>'
                    recordWarning = setTimeout(function () {
                        message.channel.send({ content: 'It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})
    
                    }, 10000)
                    
                    console.log("lol")
                    
                    if(args.length < 2){
                        clipduration = 20;
                    }else{
                        clipduration = parseInt(args[1], 10);
                    }
                    timestamp = Math.floor(await getVideoDurationInSeconds('render.mp4') - clipduration);
                    timestamptext = timestamp.toString()
                    clipdurationtext = clipduration.toString()
                    console.log(timestamp)
                    
                    let args2 = [
                        '-i', 'render.mp4', // Input file
                        '-y', //force overwrite
                        '-ss', timestamptext, 
                        '-t', clipdurationtext,
                        //'-sseof', '-5',
                        '-c:v', 'libx264', // Video codec
                        '-c:a', 'aac', // Audio codec (copy from input)
                        //'-c', 'copy',
                        'render' + clipdurationtext + 's.mp4' // Output file
                      ];
                    sleep(1000)
    
                    cut = spawn(ffmpeg, args2)
                    cut.on('close', () => { 
                        console.log('finis pour de vrai')
                        message.react("✅")
                        message.channel.send({content: "voilà frr", files: ['render' + clipdurationtext + 's.mp4']}).catch(message.channel.send('fichier trop gros mon fwewe'))
                    })
                })
            break;
            case 'reset':
                stream.close()
                ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                message.react("✅")
                message.channel.send('<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>')
                recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>'
                recordWarning = setTimeout(function () {
                    message.channel.send({ content: 'It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})

                }, 10000)
            break;
            case 'stop':
                if(stream != undefined){
                    stream.close()
                }
            break;
            case 'record':
                if(VIDEO_URL == ''){ return message.channel.send("No stream got set up")}
                ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                message.react("✅")
                recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>'
                recordWarning = setTimeout(function () {
                    message.channel.send({ content: 'It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})

                }, 10000)
            break;
            case 'stream':
                if(args.length < 2) { return }

                if(args[1].startsWith('https://www.youtube.com/live/')){
                    let s = args[1].replace('https://www.youtube.com/live/', 'https://youtu.be/')
                    VIDEO_URL = s;
                }else{
                    VIDEO_URL = args[1];
                }

                ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                message.react("✅")
                recordtime = '<t:' + Math.floor(new Date(Date.now()).getTime() / 1000) + ':R>'
                recordWarning = setTimeout(function () {
                    message.channel.send({ content: 'It has been ' + recordtime + 'since the recording started, reset it to avoid encoding a heavy file', components: [btnReset]})

                }, 10000)
            break;
            case 'recut':
                enddelay = 0;
                if(args.length > 2){
                    clipduration = parseInt(args[1], 10);
                    enddelay = parseInt(args[2], 10);
                }else{
                    if(args.length < 2){
                        clipduration = 20;
                    }else{
                        clipduration = parseInt(args[1], 10);
                    }
                }
                timestamp = Math.floor(await getVideoDurationInSeconds('render.mp4') - clipduration - enddelay);
                timestamptext = timestamp.toString()
                clipdurationtext = clipduration.toString()
                enddelaytext = enddelay.toString()

                console.log(timestamp)
                
                let args2 = [
                    '-i', 'render.mp4', // Input file
                    '-y', //force overwrite
                    '-ss', timestamptext, 
                    '-t', clipdurationtext,
                    //'-sseof', '-5',
                    '-c:v', 'libx264', // Video codec
                    '-c:a', 'aac', // Audio codec (copy from input)
                    //'-c', 'copy',
                    'render' + clipdurationtext + 's.mp4' // Output file
                  ];
                sleep(500)

                cut = spawn(ffmpeg, args2)
                cut.on('close', () => {
                    console.log('finis pour de vrai')
                    message.react("✅")
                    message.channel.send({content: "voilà frr", files: ['render' + clipdurationtext + 's.mp4']}).catch(message.channel.send('fichier trop gros mon fwewe'))
                })
            break;
        }




    }catch(e){
        console.error(e)
    }
});
*/


client.login(token);

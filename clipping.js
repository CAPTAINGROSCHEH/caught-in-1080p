const discord = require("discord.js")
const { token, guildId } = require('./config.json');
const { ActivityType, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require("discord.js");
const ytdl = require('ytdl-core');
const ffmpeg = require('ffmpeg-static');
const { spawn } = require('child_process');
const fs = require('fs');
const { time } = require("console");
const { getVideoDurationInSeconds } = require('get-video-duration');

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
	console.log(`Aller la clip adventure mon gars ! ${client.user.tag}.`);
    client.user.setPresence({
        activities: [{name: "il faut clipper", type: ActivityType.Playing}],
        status: "dnd",
    })
});

// Replace VIDEO_URL with the URL of the YouTube video you want to clip
let VIDEO_URL = 'https://youtu.be/r-g3_EYi814';


let audio_stream;

function sleep(ms){
    return new Promise(resolve => setTimeout(resolve,ms));
}

const INPUT_FILE = 'video.mp4';
const OUTPUT_FILE = 'render.mp4';
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

  

let stream;
let clipping;
let cut;
let timestamptext;
let clipduration;
let clipdurationtext;

console.log(Math.floor(new Date(Date.now()).getTime() / 1000))

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
            break;
            case 'record':
                ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                message.react("✅")
            break;
            case 'stream':
                if(args.length < 2) { return }
                VIDEO_URL = args[1];
                ytdl(VIDEO_URL).pipe(stream = fs.createWriteStream('video.mp4'))
                message.react("✅")
            break;
            case 'recut':
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
            break;
        }
        if(message.content.startsWith('sus')){
            message.channel.send({content: "voilà frr", files: ['sus.mp4']}).catch(message.channel.send('fichier trop gros mon fwewe'))
            
        }
        if(message.content == 'reset'){

        }

        if(message.content == 'clip'){
        }



        //message.channel.send({content: 'ayo?', files: ['./render.mp4']})

    }catch(e){
        console.error(e)
    }
});

client.login(token);
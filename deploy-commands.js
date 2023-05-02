const { REST, SlashCommandBuilder, Routes, ChannelType } = require('discord.js');
const { clientId, token } = require('./config.json');


const commands = [
	new SlashCommandBuilder().setName('stream').setDescription("Set the stream to record")
	.addStringOption(option => 
		option.setName("link")
			.setDescription("Stream's link")
			.setRequired(true)
	),
	
	new SlashCommandBuilder().setName('reset').setDescription("Reset the recording"),
	
	new SlashCommandBuilder().setName('stop').setDescription("Stop the recording"),
	
	new SlashCommandBuilder().setName('record').setDescription("Start the recording"),
	
	new SlashCommandBuilder().setName('c').setDescription("Clip the stream")
	.addNumberOption(option => 
		option.setName("seconds_ago")
			.setDescription("Clip from how many seconds ago")
			.setRequired(true)
			.setMinValue(0.1)
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to when you'll send this command")
	),

	new SlashCommandBuilder().setName('a').setDescription("Audio clip the stream")
	.addNumberOption(option => 
		option.setName("seconds_ago")
			.setDescription("Clip from how many seconds ago")
			.setRequired(true)
			.setMinValue(0.1)
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to when you'll send this command")
			.setMinValue(0.1)
	),

	new SlashCommandBuilder().setName('reclip').setDescription("Redo the clip of the latest recording")
	.addNumberOption(option => 
		option.setName("seconds_ago")
			.setDescription("Clip from how many seconds ago")
			.setRequired(true)
			.setMinValue(0.1)
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to the end of the latest recording")
			.setMinValue(0.1)
	),

	new SlashCommandBuilder().setName('reclipaudio').setDescription("Redo the audio clip of the latest recording")
	.addNumberOption(option => 
		option.setName("seconds_ago")
			.setDescription("Clip from how many seconds ago")
			.setRequired(true)
			.setMinValue(0.1)
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to the end of the latest recording")
			.setMinValue(0.1)
	),
	
	new SlashCommandBuilder().setName('channel').setDescription("Set channel to send your best favorite clips")
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel you want to send your favorite clips')
			.setRequired(true)
			.addChannelTypes(ChannelType.GuildText)
	),

	new SlashCommandBuilder().setName('record1080p').setDescription("Start the recording... BUT IN 1080P!"),

	new SlashCommandBuilder().setName('settings').setDescription("Change your settings!")
	.addNumberOption(option =>
		option.setName('warningtime')
			.setDescription('After how many seconds the bot will send you a warning to reset the recording')
			.setMinValue(0)
	)
	.addNumberOption(option =>
		option.setName('autoresettime')
			.setDescription('After how many seconds the bot will automatically reset the recording')
			.setMinValue(0)
	),
	
	new SlashCommandBuilder().setName('postpone').setDescription("Postpone the autoreset")
	.addNumberOption(option =>
		option.setName('seconds')
			.setDescription('After how many seconds from now the bot will automatically reset the recording')
			.setMinValue(5)
			.setRequired(true)
	)

]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);

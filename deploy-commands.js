const { REST, SlashCommandBuilder, Routes } = require('discord.js');
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
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to when you'll send this command")
	),

	new SlashCommandBuilder().setName('reclip').setDescription("Redo the clip of the latest recording")
	.addNumberOption(option => 
		option.setName("seconds_ago")
			.setDescription("Clip from how many seconds ago")
			.setRequired(true)
	)
	.addNumberOption(option => 
		option.setName("duration")
			.setDescription("Optional. Clip's duration (leaving this empty will clip up to the end of the latest recording")
	),

]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

rest.put(Routes.applicationCommands(clientId), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);

#!/usr/bin/node

// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger.js');
const mariadb = require('mariadb');
const loabot_db = require('./functions/loabot_db/db_sql.js');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token, guildId, channelId, channelIdLaboratory, channelIdRaidSelection, API_KEY} = require('./config.json');
const { emoji } = require('./DB/emoji.json');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
    ],
	allowedMentions: { parse: ['roles'] }
});

client.commands = new Collection();

(async () => {
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			// Set a new item in the Collection with the key as the command name and the value as the exported module
			if ('data' in command && 'execute' in command) {
				client.commands.set((await command.data()).name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
	
	for (const file of eventFiles) {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		if (event.once) {
			client.once(event.name, (...args) => event.execute(...args));
		} else {
			client.on(event.name, (...args) => event.execute(...args));
		}
	}

	// logging
	client.on('debug', (log) => {
		logger.info(log);
	});

	// Log in to Discord with your client's token
	client.login(token);
})();

/********** functions **********/
client.init = async () => {
	try {
		initHandler(client);
		// await client.initRaidSelectionStartButton();
		await client.initRole();
		await loabot_db.updateAllCharacters();
		console.log("Bot initialized!");
	} catch (err) {
		logger.error(err);
		console.error(err);
		process.exit();
	}
}

client.getEmoji = (emojiName) => {
	let emojiString = emoji[emojiName];
	if (!emojiString) {
		// if there's no matching emoji, return crycon
		return "1131567145030004750";
	}
	return emojiString;
}

function initHandler(client) {
	initRoleHandler(client);
	initRaidSelectionHandler(client);
	initScheculeHandler(client);
}

function initRoleHandler(client) {
	const { initRole, updateRole } = require('./functions/roleHandler.js');
	client.initRole = initRole.bind(client);
	client.updateRole = updateRole;
}

function initRaidSelectionHandler(client)  {
	const { initRaidSelectionStartButton, raidSelectionHandler } = require('./functions/raidSelectionHandler.js');
	client.initRaidSelectionStartButton = initRaidSelectionStartButton.bind(client);
	client.raidSelectionHandler = raidSelectionHandler;
}

function initScheculeHandler(client) {
	const { getScheduleJob, doResetRaid, doUpdateAllCharacters } = require('./functions/scheduleHandler.js');
	client.resetRaidScheduler = getScheduleJob('0 0 6 * * 3', doResetRaid.bind(client));
	client.updateAllCharacters = getScheduleJob('0 0 0 * * *', doUpdateAllCharacters);

	// github codespace: hour -= 9
	// const timeZoneOffset = (new Date()).getTimezoneOffset() / 60;
	// client.resetRaidScheduler = getScheduleJob(`0 0 21 * * 2`, doResetRaid.bind(client));
	// client.updateAllCharactersScheduler = getScheduleJob(`0 0 15 * * *`, doUpdateAllCharacters);
}
/********** functions **********/
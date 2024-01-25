// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { emoji } = require('./DB/emoji.json');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
    ] 
});

client.commands = new Collection();

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
			client.commands.set(command.data.name, command);
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

/********** functions **********/
client.init = () => {
	client.initRaidParticipant();
	client.initCharacterSync();
	client.dataLoad();
}

client.initRaidParticipant = () => {
	client.raidParticipant = {};
	const { raidList } = require('./environment/raidList.json');
	raidList.forEach(raid => {
		client.raidParticipant[raid.raidName] = {};
	});
}

client.initCharacterSync = () => {
	client.characterSync = {};
}

// checks if playerName of userName participates raidName
client.isPlayerRaidParticipant = (userName, playerName, raidName) => {
	if (client.raidParticipant[raidName][userName] &&
		client.raidParticipant[raidName][userName].find(x => x[0] === playerName))
		return true;
	else 
		return false;
}

client.dataBackup = () => {
	fs.writeFileSync('DB/raidParticipant.json', JSON.stringify(client.raidParticipant));
	fs.writeFileSync('DB/characterSync.json', JSON.stringify(client.characterSync));
}

client.dataLoad = () => {
	// when json file doesn't exist or is not valid, create new one
	try {
		client.raidParticipant = JSON.parse(fs.readFileSync('DB/raidParticipant.json').toString());
	} catch (e) {
		fs.writeFileSync('DB/raidParticipant.json', JSON.stringify(client.raidParticipant));
	}
	
	try {
		client.characterSync = JSON.parse(fs.readFileSync('DB/characterSync.json').toString());
	} catch (e) {
		fs.writeFileSync('DB/characterSync.json', JSON.stringify(client.characterSync));
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
/********** functions **********/

// Initialize
client.init();

// Log in to Discord with your client's token
client.login(token);
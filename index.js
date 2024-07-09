#!/usr/bin/node

// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger.js');
const mysql = require('mysql');
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
	client.writeLog = (log) => logger.info(log);

	// Log in to Discord with your client's token
	client.login(token);
})();




 



/********** functions **********/
client.init = async () => {
	// client.initSchedule();
	await client.initRole();
	await client.initInteractions();
	await loabot_db.updateAllCharacters();
	console.log("Bot initialized!");
}

client.initSchedule = () => {
	client.schedule = {};
	client.resetFlag = false; // LOADAY 06:00 RESET
	client.resetFlag2 = false; // LOADAY 10:10 CHARACTER SYNC
	setInterval(client.checkTime, 5000);
}

client.getEmoji = (emojiName) => {
	let emojiString = emoji[emojiName];
	if (!emojiString) {
		// if there's no matching emoji, return crycon
		return "1131567145030004750";
	}
	return emojiString;
}

client.initRole = async () => {
	const allMembersMap = await client.guilds.cache.get(guildId).members.fetch();
	const allMembers = [...allMembersMap.values()];
	const allRolesMap = await client.guilds.cache.get(guildId).roles.fetch();
	const allRoles = [...allRolesMap.values()];

	const raidList = await loabot_db.getRaidList();

	allMembers.forEach(async member => {
		const oldRoles = [];
		const newRoles = [];

		for (const raid of raidList) {
			const raidRole = allRoles.find(role => role.name === raid.raid_name);
			if (!raidRole) return;
			
			if([...member.roles.cache.keys()].includes(raidRole.id)) {
				oldRoles.push(raidRole);
			}

			const characters = await loabot_db.getCharacters(member.user.username);
			for (const character of characters) {
				if (await loabot_db.isRaidParticipant(character[0], raid.raid_name)) {
					newRoles.push(raidRole);
					break;
				}
			}
		}
		
		const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
		const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
		roleToAdd.forEach(role => member.roles.add(role));
		roleToRemove.forEach(role => member.roles.remove(role));
	});
}

client.updateRole = async (interaction) =>  {
	const allRolesMap = await interaction.guild.roles.fetch();
	const allRoles = [...allRolesMap.values()];

	const raidList = await loabot_db.getRaidList();

	const member = interaction.member;
	const oldRoles = [];
	const newRoles = [];


	for (const raid of raidList) {
		const raidRole = allRoles.find(role => role.name === raid.raid_name);
		if (!raidRole) return;
		
		if([...member.roles.cache.keys()].includes(raidRole.id)) {
			oldRoles.push(raidRole);
		}

		const characters = await loabot_db.getCharacters(member.user.username);
		for (const character of characters) {
			if (await loabot_db.isRaidParticipant(character[0], raid.raid_name)) {
				newRoles.push(raidRole);
				break;
			}
		}
	}
	
	const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
	const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
	roleToAdd.forEach(role => member.roles.add(role));
	roleToRemove.forEach(role => member.roles.remove(role));
}

client.initInteractions = async () => {
	// await client.initRaidSelectionStartButton();
	client.raidSelectionHandler = require('./functions/interactions/raidSelectionHandler.js');
};

client.checkTime = async () => {
	// IMPORTANT: github codespace follow utc+0 timezone, but raspberry pi timezone is set to utc+9
	let machineDateObj = new Date();
    let machineDate = machineDateObj.toLocaleDateString();
    let machineMinutes = machineDateObj.getMinutes();
    let machineHours = machineDateObj.getHours();

	// uncomment in github codespace
	// machineHours += 9;

	let newMachineDateObj = new Date(`${machineDate} ${machineHours}:${machineMinutes}`);
	let machineTime = newMachineDateObj.getTime();

	///// SCHEDULE /////
	let foundSchedule  = [];
	for (const scheduleKey of Object.keys(client.schedule)) {
		if (client.schedule[scheduleKey].rawTime <= machineTime) {
			const channel = client.channels.cache.get(channelId);
			// const channel = client.channels.cache.get(channelIdLaboratory); << Laboratory channel id
			const roleName = `${scheduleKey.split('|')[0]}`;
			const roleId = client.guilds.cache.get(guildId).roles.cache.find(r => r.name === roleName) ?? roleName;
			await channel.send(`[${roleId}]: ${client.schedule[scheduleKey].parsedTime} 알림!`);
			foundSchedule.push(scheduleKey);
		}
	}

	for (const scheduleKey of foundSchedule) {
		delete client.schedule[scheduleKey];
		client.dataBackup();
	}
	///// SCHEDULE /////

	///// LOADAY /////
	const DAY_ARR = ['일', '월', '화', '수', '목', '금', '토'];
	if (DAY_ARR[newMachineDateObj.getDay()] === '수' &&
			newMachineDateObj.getHours() === 6 &&
			newMachineDateObj.getMinutes() === 0) {
		if (client.resetFlag === false) {
			await loabot_db.resetRaidParticipant();
			await client.initRole();
			client.resetFlag = true;
			const channel = client.channels.cache.get(channelId);
			await channel.send(`레이드 초기화 완료!`);
		}
	} else {
		client.resetFlag = false;
	}

	// API online된 10시 10분에 캐릭터 정보 업데이트
	if (DAY_ARR[newMachineDateObj.getDay()] === '수' &&
			newMachineDateObj.getHours() === 10 &&
			newMachineDateObj.getMinutes() === 10) {
		if (client.resetFlag2 === false) {
			await client.updateAllCharacter();
			client.dataBackup();
			client.resetFlag2 = true;
		}
	} else {
		client.resetFlag2 = false;
	}
	///// LOADAY /////
}


const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
client.initRaidSelectionStartButton = async () => {
	if (!client.messageId) {
		const channel = client.channels.cache.get(channelIdRaidSelection);
		const confirm = new ButtonBuilder()
			.setCustomId('raidSelectionStartButton')
			.setLabel('레이드 선택 시작')
			.setStyle(ButtonStyle.Success);

		const row = new ActionRowBuilder()
			.addComponents(confirm);
		client.messageId = await channel.send({
			content: `이번 주 레이드 선택`,
			components: [row]
		});
	} else {
		return;
	}
};

/********** functions **********/
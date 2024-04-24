#!/usr/bin/node

// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const logger = require('./logger.js');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token, guildId, channelId, channelIdLaboratory, channelIdRaidSelection, API_KEY} = require('./config.json');
const { emoji } = require('./DB/emoji.json');
const { raidList } = require('./environment/raidList.json');

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

// logging
client.on('debug', (log) => {
	logger.info(log);
});


// Log in to Discord with your client's token
client.login(token);
 



/********** functions **********/
client.init = async () => {
	client.initRaidParticipant();
	client.initMainCharacter();
	client.initCharacterSync();
	client.initSchedule();
	client.dataLoad();
	await client.initRole();
	await client.updateAllCharacter();
	// client.initRaidSelectionStartButton();
	console.log("Bot initialized!");
}

client.initRaidParticipant = () => {
	client.raidParticipant = {};
	raidList.forEach(raid => {
		client.raidParticipant[raid.raidName] = {};
	});
}

client.initMainCharacter = () => {
	client.mainCharacter = {};
}

client.initCharacterSync = () => {
	client.characterSync = {};
}

client.initSchedule = () => {
	client.schedule = {};
	client.resetFlag = false;
	setInterval(client.checkTime, 5000);
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
	fs.writeFileSync('DB/mainCharacter.json', JSON.stringify(client.mainCharacter));
	fs.writeFileSync('DB/characterSync.json', JSON.stringify(client.characterSync));
	fs.writeFileSync('DB/schedule.json', JSON.stringify(client.schedule));
}

client.dataLoad = () => {
	// when json file doesn't exist or is not valid, create new one
	try {
		client.raidParticipant = JSON.parse(fs.readFileSync('DB/raidParticipant.json').toString());

		// When new raid is added to raidList.json, set the value of the new raid with empty object
		// TODO: should handle when raid is deleted from raidList.json
		raidList.forEach(raid => {
			if (!Object.keys(client.raidParticipant).includes(raid.raidName)) {
				client.raidParticipant[raid.raidName] = {};
			}
		});
		
	} catch (e) {
		fs.writeFileSync('DB/raidParticipant.json', JSON.stringify(client.raidParticipant));
	}
	
	try {
		client.mainCharacter = JSON.parse(fs.readFileSync('DB/mainCharacter.json').toString());
	} catch (e) {
		fs.writeFileSync('DB/mainCharacter.json', JSON.stringify(client.mainCharacter));
	}

	try {
		client.characterSync = JSON.parse(fs.readFileSync('DB/characterSync.json').toString());
	} catch (e) {
		fs.writeFileSync('DB/characterSync.json', JSON.stringify(client.characterSync));
	}
	

	try {
		client.schedule = JSON.parse(fs.readFileSync('DB/schedule.json').toString());
	} catch (e) {
		fs.writeFileSync('DB/schedule.json', JSON.stringify(client.schedule));
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

client.initRole = async () => {
	const allMembersMap = await client.guilds.cache.get(guildId).members.fetch();
	const allMembers = [...allMembersMap.values()];
	const allRolesMap = await client.guilds.cache.get(guildId).roles.fetch();
	const allRoles = [...allRolesMap.values()];

	allMembers.forEach(member => {
		const oldRoles = [];
		const newRoles = [];

		raidList.forEach(raid => {
			const raidRole = allRoles.find(role => role.name === raid.raidName);
			if (!raidRole) return;
			
			if([...member.roles.cache.keys()].includes(raidRole.id)) {
				oldRoles.push(raidRole);
			}
			if (client.raidParticipant[raid.raidName][member.user.username]) {
				newRoles.push(raidRole);
			}
		});
		
		const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
		const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
		roleToAdd.forEach(role => member.roles.add(role));
		roleToRemove.forEach(role => member.roles.remove(role));
	});
}

client.updateRole = async (interaction) =>  {
	const allRolesMap = await interaction.guild.roles.fetch();
	const allRoles = [...allRolesMap.values()];

	const member = interaction.member;
	const oldRoles = [];
	const newRoles = [];

	raidList.forEach(raid => {
		const raidRole = allRoles.find(role => role.name === raid.raidName);
		if (!raidRole) return;
		
		if([...member.roles.cache.keys()].includes(raidRole.id)) {
			oldRoles.push(raidRole);
		}
		if (client.raidParticipant[raid.raidName][member.user.username]) {
			newRoles.push(raidRole);
		}
	});
	
	const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
	const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
	roleToAdd.forEach(role => member.roles.add(role));
	roleToRemove.forEach(role => member.roles.remove(role));
}

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
			client.initRaidParticipant();
			await client.initRole();
			await client.updateAllCharacter();
			client.dataBackup();
			client.resetFlag = true;
			const channel = client.channels.cache.get(channelId);
			await channel.send(`레이드 초기화 완료!`);
		}
	} else {
		client.resetFlag = false;
	}
	///// LOADAY /////
}

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
client.initRaidSelectionStartButton = async () => {
	if (!client.messageId) {
		const channel = client.channels.cache.get(channelIdRaidSelection); //<< Laboratory channel id
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
}

client.initRaidSelection = async (interaction) => {
	const characterList = client.characterSync[interaction.user.username];
	if (!characterList) {
		await interaction.reply({
			content: "캐릭터 리스트 받아오기 실패. \n캐릭터 연동을 확인해주세요.",
			ephemeral: true
		});
		return;
	}
	
	await interaction.deferReply({ephemeral: true});

	for (const selectedRaid of raidList) {
		const possibleCharacterList = characterList.filter(character => character[2] >= selectedRaid.itemLevel).reverse();
		if (possibleCharacterList.length === 0) continue;
		
		const playerSelection = new StringSelectMenuBuilder()
			.setCustomId(`${selectedRaid.raidName}newPlayerSelection`)
			.setPlaceholder(`${selectedRaid.raidName} 참여 캐릭터 선택`)
			.setMinValues(0)
			.setMaxValues(possibleCharacterList.length)
			.addOptions(
				...(possibleCharacterList.map(character => {
					return new StringSelectMenuOptionBuilder()
						.setLabel(character[0]+"/"+character[1]+"/"+character[2])
						.setValue(JSON.stringify(character))
						.setEmoji(client.getEmoji(character[1]))
						.setDefault(client.isPlayerRaidParticipant(interaction.user.username, character[0], selectedRaid.raidName));
				}))
			);
	
		const row = new ActionRowBuilder()
			.addComponents(playerSelection);
	
		const response = await interaction.followUp({
			content: `${selectedRaid.raidName}에 참여하는 캐릭터 선택`,
			components: [row],
			ephemeral: true
		});
	}
}

client.updateCharacter = async (userName, playerNameList) => {
	let characterList = [];
	for (const playerName of playerNameList) {
		characterList = characterList.concat(await parseCharacters(playerName));
	}

	if (!characterList) {
		return false;
	}
	client.mainCharacter[userName] = playerNameList;
	client.characterSync[userName] = characterList;
	return true;
}

client.updateAllCharacter = async () => {
	for (const userName of Object.keys(client.mainCharacter)) {
		const playerNameList = client.mainCharacter[userName];
		await client.updateCharacter(userName, playerNameList);
	}
}

async function fetchCharacters(playerName) {
	let options = {
	  'method': 'get',
	  'headers': {
		'accept': 'application/json',
		'authorization': 'bearer ' + API_KEY
	  }
	}
	let res = await fetch(`https://developer-lostark.game.onstove.com/characters/${playerName}/siblings`, options);
	return await res.json();
}

async function parseCharacters(playerName) {
	let characters = await fetchCharacters(playerName);
	if (!characters) return null;
	characters = characters.filter(character => {
		return parseFloat((character.ItemAvgLevel).replaceAll(",", "")) > 0;
	});
	characters.sort((a, b) => {
	  return parseFloat((b.ItemAvgLevel).replaceAll(",", "")) - parseFloat((a.ItemAvgLevel).replaceAll(",", ""))
	});
  
	let result = [];
	for (let i = 0; i < characters.length; i++) {
		let char = characters[i];
		let CharacterName = char.CharacterName;
		let CharacterClassName = char.CharacterClassName;
		let ItemAvgLevel = parseFloat((char.ItemAvgLevel).replaceAll(",",""));
		result.push([CharacterName, CharacterClassName, ItemAvgLevel]);
	}
	return result;
}
/********** functions **********/
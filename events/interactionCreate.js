const { Events } = require('discord.js');
const loabot_db = require('../functions/loabot_db/db_sql.js');
const logger = require('../logger.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		// const interactionTypeName = interaction.constructor.name;
		// switch문에 사용하려고 했는데 constructor 이름으로만 판단하는거라 위험성이 있음.
		// 안전하게 BaseInteraction이 제공하는 타입 검사 함수로 if else 반복.
		
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}
	
			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
				} else {
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
		} else if (interaction.isButton()) {
			if (interaction.customId === 'raidSelectionStartButton') {
				await interaction.client.raidSelectionHandler(interaction);
			}
		} else if (interaction.isStringSelectMenu()) {
			if (interaction.customId.includes('newPlayerSelection')) {
				try {
					const selectedPlayers = interaction.values.map(v => JSON.parse(v));
					const selectedRaidName = interaction.customId.replace("newPlayerSelection", "");
					await loabot_db.deleteAllRaidParticipant(interaction.user.username, selectedRaidName);
					for (const character of selectedPlayers) {
						await loabot_db.addRaidParticipant(character[0], selectedRaidName);
					}
					await interaction.client.updateRole(interaction);
					
					const row = interaction.message.components[0];
					row.components[0].data.options.forEach(option => {
						if (interaction.values.includes(option.value)) {
							option.default = true;
						} else {
							option.default = false;
						}
					});
					
					await interaction.update({
						content: `${selectedRaidName}에 참여하는 캐릭터 선택`,
						components: [row]
					});
				} catch (err) {
					logger.error(err);
					console.error(err);
					await interaction.reply({
						content: `레이드선택 실패: ${err}`,
						ephemeral: true
					});
					
				}
			}
		}
	},
};
const { Events } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
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
				await interaction.client.initRaidSelection(interaction);
			}
		} else if (interaction.isStringSelectMenu()) {
			if (interaction.customId.includes('newPlayerSelection')) {
				const selectedPlayers = interaction.values.map(v => JSON.parse(v));
				const selectedRaidName = interaction.customId.replace("newPlayerSelection", "");
                // delete entry when empty
                if (selectedPlayers.length === 0) {
                    delete interaction.client.raidParticipant[selectedRaidName][interaction.user.username];
                } else {
                    interaction.client.raidParticipant[selectedRaidName][interaction.user.username] = selectedPlayers;
                }
                interaction.client.updateRole(interaction);
                interaction.client.dataBackup();
				
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
			}
		}
	},
};
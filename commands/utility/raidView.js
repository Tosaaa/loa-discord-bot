const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드현황')
        .setDescription('이번 주 레이드 현황'),
    
    async execute(interaction) {
        let result = `----------이번 주 레이드 현황----------\n`;
        for (const raidName of Object.keys(interaction.client.raidParticipant)) {
            // skip raid when nobody participates
            if (Object.keys(interaction.client.raidParticipant[raidName]).length === 0) continue;

            result += `[${raidName}]\n`;
            for (const userName of Object.keys(interaction.client.raidParticipant[raidName])) {
                result += `${userName}: `;
                interaction.client.raidParticipant[raidName][userName].forEach(character=> {
                    result += `${character[0]} `;
                });
                result += `\n`
            }
        }
        result += `---------------------------------------`;
        await interaction.reply({
            content: result
        });
    },
}
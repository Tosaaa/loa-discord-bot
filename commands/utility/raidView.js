//TODO: 현재 레이드 참여 현황 출력

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드현황')
        .setDescription('이번 주 레이드 현황'),
    
    async execute(interaction) {
        let result = `----------이번 주 레이드 현황----------\n`;
        for (const raidName of Object.keys(interaction.client.raidParticipant)) {
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
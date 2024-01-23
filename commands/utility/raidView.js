//TODO: 현재 레이드 참여 현황 출력

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드현황')
        .setDescription('이번 주 레이드 현황'),
    
    async execute(interaction) {
        let result = "[이번주 레이드 현황]\n";
        interaction.client.raidParticipant.forEach((participant, raidName) => {
            result += raidName + ":\n";
            result += [...participant] + "\n";
        });

        await interaction.reply({
            content: result
        });
    },
}
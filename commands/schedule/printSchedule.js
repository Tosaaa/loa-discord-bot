const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('일정현황')
        .setDescription('레이드 일정 현황'),
    
    async execute(interaction) {
        const client = interaction.client;

        let result = `----------이번 주 일정 현황----------\n`;
        for (const scheduleKey of Object.keys(client.schedule)) {
            result += `[${scheduleKey.split('|')[0]}]: ${client.schedule[scheduleKey].parsedTime}\n`;
        }
        result += `---------------------------------------`;
        await interaction.reply({
            content: result
        });
    },
}
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('일정현황')
        .setDescription('레이드 일정 현황'),
    
    async execute(interaction) {
        const client = interaction.client;

        let result = `**[이번 주 일정 현황]**\n`;
        let embedList = [];
        
        embedList.push(this.createEmbedBySchedule(client.schedule));

        await interaction.reply({
            content: result,
            embeds: embedList
        });
    },
    
    createEmbedBySchedule(schedule) {
        const embed = {}
        embed.color = 0xf0dc7a;
        embed.title = `이번 주 일정`;
        embed.fields = [];
        for (const scheduleKey of Object.keys(schedule)) {
            //TODO: 딜, 폿 구분해서 출력하기 (클래스 DB 만들어야 할 듯)
            let name = `[${scheduleKey.split('|')[0]}]`;
            let value = `${schedule[scheduleKey].parsedTime}`;
            embed.fields.push({"name": name, "value": value});
        }

        return embed;
    }
}
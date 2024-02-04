const { SlashCommandBuilder } = require('discord.js');
const { raidList } = require('../../environment/raidList.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드현황')
        .setDescription('이번 주 레이드 현황')
        .addStringOption(option => 
            option.setName("레이드종류")
                .setDescription("레이드 종류를 입력해주세요")
                .setRequired(true)
                .addChoices(
                    ...(raidList.map(raid => {
                        return {name: raid.raidName, value: JSON.stringify(raid)};
                    })),
                )),
    
    async execute(interaction) {
        const selectedRaid = JSON.parse(interaction.options.getString("레이드종류"));

        let result = `**[이번 주 레이드 현황]**\n`;
        let embedList = [];

        embedList.push(this.createEmbedByRaidName(interaction, selectedRaid.raidName));
        // DEPRECATED (used when this command printed all raid)
        // for (const raidName of Object.keys(interaction.client.raidParticipant)) {
        //     // skip raid when nobody participates
        //     if (Object.keys(interaction.client.raidParticipant[raidName]).length === 0) continue;
        //     embedList.push(this.createEmbedByRaidName(interaction, raidName));
        // }

        await interaction.reply({
            content: result,
            embeds: embedList
        });
    },

    createEmbedByRaidName(interaction, raidName) {
        const embed = {}
        embed.color = interaction.guild.roles.cache.find(r => r.name === raidName).color;
        embed.title = raidName;
        embed.fields = [];
        for (const userName of Object.keys(interaction.client.raidParticipant[raidName])) {
            //TODO: 딜, 폿 구분해서 출력하기 (클래스 DB 만들어야 할 듯)
            let name = `${userName} (${interaction.client.raidParticipant[raidName][userName].length}캐릭)`;
            let value = interaction.client.raidParticipant[raidName][userName].map(character => character[0]).join(' | ');
            embed.fields.push({"name": name, "value": value});
        }

        return embed;
    }
}
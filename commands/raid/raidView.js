const { SlashCommandBuilder } = require('discord.js');
const { classData } = require('../../environment/codex.json');
const loabot_db = require('../../functions/loabot_db/db_sql.js');

module.exports = {
    data: async () => {
        const raidList = await loabot_db.getRaidList();
        return new SlashCommandBuilder()
        .setName('레이드현황')
        .setDescription('이번 주 레이드 현황')
        .addStringOption(option => {
            option.setName("레이드종류")
                .setDescription("레이드 종류를 입력해주세요")
                .setRequired(true)
                .addChoices(
                    ...(raidList.map(raid => {
                        return {name: raid.raid_name, value: JSON.stringify(raid)};
                    })),
                )
            return option;
            });
    },
        
    async execute(interaction) {
        const selectedRaid = JSON.parse(interaction.options.getString("레이드종류"));

        let result = `**[이번 주 레이드 현황]**\n`;
        let embedList = [];

        try {
            embedList.push(await this.createEmbedByRaidName(interaction, selectedRaid.raid_name));
            await interaction.reply({
                content: result,
                embeds: embedList
            });
        } catch (err) {
            interaction.client.writeLog(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            console.log(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            await interaction.reply({
                content: `레이드현황 실패: ${err}`,
                ephemeral: true
            });
        }
        // DEPRECATED (used when this command printed all raid)
        // for (const raid_name of Object.keys(interaction.client.raidParticipant)) {
        //     // skip raid when nobody participates
        //     if (Object.keys(interaction.client.raidParticipant[raid_name]).length === 0) continue;
        //     embedList.push(this.createEmbedByRaidName(interaction, raid_name));
        // }

   
    },

    async createEmbedByRaidName(interaction, raid_name) {
        const client = interaction.client;
        const embed = {}
        embed.color = interaction.guild.roles.cache.find(r => r.name === raid_name).color;
        embed.title = raid_name;
        embed.fields = [];

        const raidParticipant = await loabot_db.getRaidParticipant(raid_name);
        for (const discord_id of Object.keys(raidParticipant)) {
            //TODO: 딜, 폿 구분해서 출력하기 (클래스 DB 만들어야 할 듯)
            let DPSCount = 0;
            let SupportCount = 0;
            for (const character_name of raidParticipant[discord_id]) {
                if (await loabot_db.isSupport(character_name)) {
                    SupportCount++;
                } else {
                    DPSCount++;
                }
            }
                
            let name;
            if (DPSCount && SupportCount)
                name = `${discord_id} (딜${DPSCount} 폿${SupportCount})`;
            else if (DPSCount)
                name = `${discord_id} (딜${DPSCount})`;
            else
                name = `${discord_id} (폿${SupportCount})`;

            let value = raidParticipant[discord_id].join(' | ');
            embed.fields.push({"name": name, "value": value});
        }

        return embed;
    }
}
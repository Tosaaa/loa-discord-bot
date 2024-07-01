const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const loabot_db = require('../../functions/loabot_db/db_sql.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드초기화')
        .setDescription('레이드 현황 초기화'),
    
    async execute(interaction) {

        const confirm = new ButtonBuilder()
			.setCustomId('네')
			.setLabel('초기화')
			.setStyle(ButtonStyle.Danger);

		const cancel = new ButtonBuilder()
			.setCustomId('아니요')
			.setLabel('취소')
			.setStyle(ButtonStyle.Secondary);

		const row = new ActionRowBuilder()
			.addComponents(cancel, confirm);

		const response = await interaction.reply({
			content: `정말 레이드 현황을 초기화 하시겠습니까?`,
			components: [row]
		});

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
            if (confirmation.customId === '네') {
                await loabot_db.resetRaidParticipant();
                await interaction.client.initRole();
                await confirmation.update({ content: '레이드 초기화 완료!', components: [] });
            } else {
                await interaction.deleteReply();
                return;
            }
        } catch (e) {
            await interaction.editReply({ content: '입력 시간 초과 (1분) 또는 에러 발생', components: [] });
        }
    },
}

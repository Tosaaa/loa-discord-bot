//TODO: 이모지 로아 코덱스에서 받아서 설정해보기, 몇 마리 참여하는지? 어떤 캐릭으로 가는지? 등등 선택 가능하게? 
// 본인 대표 캐릭터 닉네임 지정하게 해야할 듯..

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드선택')
        .setDescription('이번 주 레이드 선택'),

    async execute(interaction) {
        const raidSelection = new StringSelectMenuBuilder()
			.setCustomId('raidSelection')
			.setPlaceholder('레이드 선택')
            .setMinValues(0)
            .setMaxValues(9)
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('쿠크')
					.setValue('쿠크')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '쿠크'))
					.setEmoji('😀'),
				new StringSelectMenuOptionBuilder()
					.setLabel('노양겔')
					.setValue('노양겔')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '노양겔'))
                    .setEmoji('😃'),
				new StringSelectMenuOptionBuilder()
					.setLabel('하양겔')
					.setValue('하양겔')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '하양겔'))
                    .setEmoji('😄'),
                new StringSelectMenuOptionBuilder()
					.setLabel('노칸')
					.setValue('노칸')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '노칸'))
                    .setEmoji('😁'),
                new StringSelectMenuOptionBuilder()
					.setLabel('하칸')
					.setValue('하칸')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '하칸'))
                    .setEmoji('😆'),
                new StringSelectMenuOptionBuilder()
					.setLabel('상노탑')
					.setValue('상노탑')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '상노탑'))
                    .setEmoji('😅'),
                new StringSelectMenuOptionBuilder()
					.setLabel('노멘')
					.setValue('노멘')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '노멘'))
                    .setEmoji('😂'),
                new StringSelectMenuOptionBuilder()
					.setLabel('상하탑')
					.setValue('상하탑')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '상하탑'))
                    .setEmoji('🤣'),
                new StringSelectMenuOptionBuilder()
					.setLabel('하멘')
					.setValue('하멘')
                    .setDefault(interaction.client.checkPlayerInRaid(interaction.user.username, '하멘'))
                    .setEmoji('🧐'),
			);
            
        const row = new ActionRowBuilder()
                .addComponents(raidSelection);

        const response = await interaction.reply({
            content: "이번 주 레이드를 선택해주세요",
            components: [row],
            ephemeral: true
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if (confirmation.customId === 'raidSelection') {
                const selectedRaids = confirmation.values;

                interaction.client.raid.forEach((userSet, raid) => {
                    // console.log(raid, userSet);
                    if (selectedRaids.includes(raid)) {
                        userSet.add(interaction.user.username);
                    } else if (userSet.has(interaction.user.username)) {
                        userSet.delete(interaction.user.username);
                    }
                });
                // console.log(interaction.client.raid);

                await confirmation.update({
                    content: "이번 주 레이드 저장 완료!",
                    components: []
                });
            } else {
                console.error("이럴 수가 없는데..");
                await interaction.deleteReply();
            }
        } catch (e) {
            await interaction.editReply({ content: '타임 아웃', components: [] });
        }

    },
}
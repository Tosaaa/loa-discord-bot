const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');
const { raidList } = require('../../environment/raidList.json');

module.exports = {
    data: async () => {
        return new SlashCommandBuilder()
        .setName('일정삭제')
        .setDescription('레이드 일정 삭제');
    },

    async execute(interaction) {
        const client = interaction.client;
        const scheduleKeyList = Object.keys(client.schedule);
        if (scheduleKeyList.length === 0) {
            await interaction.reply({
                content: `삭제할 일정이 없습니다.`,
            });
            return;
        }

        const scheduleSelection = new StringSelectMenuBuilder()
            .setCustomId('scheduleSelection')
            .setPlaceholder('일정 선택')
            .setMinValues(1)
            .setMaxValues(scheduleKeyList.length)
            .addOptions(
                ...(scheduleKeyList.map(scheduleKey => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(`${scheduleKey.split('|')[0]}: ${client.schedule[scheduleKey].parsedTime}`)
                        .setValue(String(client.schedule[scheduleKey].rawTime))
                }))
            );

        const row = new ActionRowBuilder()
            .addComponents(scheduleSelection);

        const response = await interaction.reply({
            content: `삭제할 일정을 선택해주세요`,
            components: [row]
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if (confirmation.customId === 'scheduleSelection') {
                let foundSchedule = [];

                const selectedScheduleRawTimeList = confirmation.values.map(v => parseInt(v));
                for (const selectedScheduleRawTime of selectedScheduleRawTimeList) {
                    for (const scheduleKey of Object.keys(client.schedule)) {
                        if (client.schedule[scheduleKey].rawTime === selectedScheduleRawTime) {
                            foundSchedule.push(scheduleKey);
                        }
                    }
                }

                for (const s of foundSchedule) {
                    delete client.schedule[s];
                }

                client.dataBackup();
                await confirmation.update({
                    content: "삭제 완료!",
                    components: []
                });
            } else {
                console.log("이럴 수가 없는데..");
                await interaction.deleteReply();
            }
        } catch (e) {
            await interaction.editReply({ content: '입력 시간 초과 (1분) 또는 에러 발생', components: [] });
        }
    },
}
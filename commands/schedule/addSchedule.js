const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');
const { raidList } = require('../../environment/raidList.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('일정추가')
        .setDescription('레이드 일정 추가')
        .addStringOption(option => 
            option.setName("레이드종류")
                .setDescription("레이드 종류를 선택해주세요")
                .setRequired(true)
                .addChoices(
                    ...(raidList.map(raid => {
                        return {name: raid.raidName, value: JSON.stringify(raid)};
                    })),
                ))
        .addStringOption(option =>
            option.setName("year")
                .setDescription("연")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("month")
                .setDescription("월")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("day")
                .setDescription("일")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("hour")
                .setDescription("시간")
                .setRequired(true))
        .addStringOption(option =>
            option.setName("minute")
                .setDescription("분")
                .setRequired(true)),

    async execute(interaction) {
        const client = interaction.client;

        const selectedRaid = JSON.parse(interaction.options.getString("레이드종류"));
        const YYYY = interaction.options.getString("year");
        const MM = interaction.options.getString("month");
        const DD = interaction.options.getString("day");
        const hh = interaction.options.getString("hour");
        const mm = interaction.options.getString("minute");
        const date = this.parseInput(YYYY, MM, DD, hh, mm);
        if (!date) {
            await interaction.reply({
                content: "날짜 입력 형식이 잘못되었습니다.",
                ephemeral: true
            });
            return;
        }

        client.schedule[`${selectedRaid.raidName}|${date.getTime()}`] = 
        {
            "rawTime": date.getTime(),
            "parsedTime": `${date.toLocaleString()}`
        };
        client.dataBackup();

        let res = `일정 등록 완료!\n`;
        res += `${selectedRaid.raidName}: ${date.toLocaleString()}`;
        await interaction.reply({
            content: res
        });
    },

    parseInput(YYYY, MM, DD, hh, mm) {
        let result = new Date(`${YYYY}/${MM}/${DD} ${hh}:${mm}`);
        if (result == 'Invalid Date') result = null;
        return result;
    }
}
//TODO: 이모지 로아 코덱스에서 받아서 설정해보기, 몇 마리 참여하는지? 어떤 캐릭으로 가는지? 등등 선택 가능하게? 
// 본인 대표 캐릭터 닉네임 지정하게 해야할 듯..

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');
const { raidList } = require('../../environment/raidList.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드선택')
        .setDescription('이번 주 레이드 선택')
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
        const characterList = interaction.client.characterSync[interaction.user.username];
        if (!characterList) {
            await interaction.reply({
                content: "캐릭터 리스트 받아오기 실패. \n캐릭터 연동을 확인해주세요.",
                ephemeral: true
            });
            return;
        }

        const selectedRaid = JSON.parse(interaction.options.getString("레이드종류"));
        const possibleCharacterList = characterList.filter(character => character[2] >= selectedRaid.itemLevel);
        if (possibleCharacterList.length === 0) {
            await interaction.reply({
                content: "해당 레이드를 갈 수 있는 캐릭터가 없습니다.",
                ephemeral: true
            });
            return;
        }

        const playerSelection = new StringSelectMenuBuilder()
            .setCustomId('playerSelection')
            .setPlaceholder('참여 캐릭터 선택')
            .setMinValues(0)
            .setMaxValues(possibleCharacterList.length)
            .addOptions(
                ...(possibleCharacterList.map(character => {
                    return new StringSelectMenuOptionBuilder()
                        .setLabel(character[0]+"/"+character[1]+"/"+character[2])
                        .setValue(JSON.stringify(character))
                        .setEmoji(interaction.client.getEmoji(character[1]))
                        .setDefault(interaction.client.isPlayerRaidParticipant(interaction.user.username, character[0], selectedRaid.raidName));
                }))
            );

        const row = new ActionRowBuilder()
            .addComponents(playerSelection);

        const response = await interaction.reply({
            content: `${selectedRaid.raidName}에 참여하는 캐릭터 선택`,
            components: [row],
            ephemeral: true
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if (confirmation.customId === 'playerSelection') {
                const selectedPlayers = confirmation.values.map(v => JSON.parse(v));
                interaction.client.raidParticipant[selectedRaid.raidName][interaction.user.username] = selectedPlayers;
                interaction.client.dataBackup();
                await confirmation.update({
                    content: "저장 완료!",
                    components: []
                });
            } else {
                console.log("이럴 수가 없는데..");
                await interaction.deleteReply();
            }
        } catch (e) {
            console.log(e);
            await interaction.editReply({ content: '입력 시간 초과 (1분) 또는 에러 발생', components: [] });
        }
    },
}
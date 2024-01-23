//TODO: 이모지 로아 코덱스에서 받아서 설정해보기, 몇 마리 참여하는지? 어떤 캐릭으로 가는지? 등등 선택 가능하게? 
// 본인 대표 캐릭터 닉네임 지정하게 해야할 듯..

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');
const { raidList } = require('../../environment/raid.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('레이드선택')
        .setDescription('이번 주 레이드 선택'),

    async execute(interaction) {
        const characterList = interaction.client.characterSync.get(interaction.user.username);
        if (!characterList) {
            await interaction.reply({
                content: "캐릭터 리스트 받아오기 실패. \n캐릭터 연동을 확인해주세요.",
                ephemeral: true
            });
            return;
        }
        await interaction.deferReply({ ephemral: true });

        for (let i = 0; i < raidList.length; i++) {
            const raid = raidList[i];
            const playerSelection = new StringSelectMenuBuilder()
                .setCustomId(raid.raidName + 'playerSelection')
                .setPlaceholder('참여 캐릭터 선택')
                .setMinValues(0)
                .setMaxValues(characterList.length)
                .addOptions(
                    ...(characterList.map(character => {
                        return new StringSelectMenuOptionBuilder()
                            .setLabel(character[0]+"/"+character[1]+"/"+character[2])
                            .setValue(JSON.stringify(character))
                            .setEmoji('😀') // 나중에 raid.json에 custom emoji id 추가
                            .setDefault(interaction.client.isPlayerRaidParticipant(character, raid.raidName));
                    }))
                );

            const row = new ActionRowBuilder()
                .addComponents(playerSelection);

            const response = await interaction.editReply({
                content: `${raid.raidName}에 참여하는 캐릭터 선택 (${i+1}/${raidList.length})`,
                components: [row],
                ephemeral: true
            });

            const collectorFilter = i => i.user.id === interaction.user.id;

            try {
                const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

                if (confirmation.customId === raid.raidName + 'playerSelection') {
                    const selectedPlayers = confirmation.values.map(v => JSON.parse(v));
                    console.log(selectedPlayers);
                    interaction.client.raidParticipant.get(raid.raidName).set(interaction.user.username, selectedPlayers);

                    await confirmation.update({
                        content: "",
                        components: []
                    });
                    // TODO: 여기서 오류남..;; 해결 시급
                } else {
                    console.error("이럴 수가 없는데..");
                    await interaction.deleteReply();
                }
            } catch (e) {
                await interaction.editReply({ content: '입력 시간 초과 (1분)', components: [] });
            }
        }
    },
}
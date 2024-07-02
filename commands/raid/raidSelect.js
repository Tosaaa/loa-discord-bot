//TODO: move all selection menu to embed (too tedious now)

const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');
const loabot_db = require('../../functions/loabot_db/db_sql.js');

module.exports = {
    data: async () => {
        const raidList = await loabot_db.getRaidList();
        return new SlashCommandBuilder()
        .setName('레이드선택')
        .setDescription('이번 주 레이드 선택')
        .addStringOption(option => 
            option.setName("레이드종류")
                .setDescription("레이드 종류를 입력해주세요")
                .setRequired(true)
                .addChoices(
                    ...(raidList.map(raid => {
                        return {name: raid.raid_name, value: JSON.stringify(raid)};
                    })),
                ));
    },

    async execute(interaction) {
        const characterList = await loabot_db.getCharacters(interaction.user.username);
        if (!characterList) {
            await interaction.reply({
                content: "캐릭터 리스트 받아오기 실패. \n캐릭터 연동을 확인해주세요.",
                ephemeral: true
            });
            return;
        }

        const selectedRaid = JSON.parse(interaction.options.getString("레이드종류"));
        const possibleCharacterList = characterList.filter(character => character[2] >= selectedRaid.required_item_level);
        if (possibleCharacterList.length === 0) {
            await interaction.reply({
                content: "해당 레이드를 갈 수 있는 캐릭터가 없습니다.",
                ephemeral: true
            });
            return;
        }

        const selectOptions = [];
        for (const character of possibleCharacterList) {
            selectOptions.push(
                new StringSelectMenuOptionBuilder()
                .setLabel(character[0]+"/"+character[1]+"/"+character[2])
                .setValue(JSON.stringify(character))
                .setEmoji(interaction.client.getEmoji(character[1]))
                .setDefault(await loabot_db.isRaidParticipant(character[0], selectedRaid.raid_name))
            );
        }

        const playerSelection = new StringSelectMenuBuilder()
            .setCustomId('playerSelection')
            .setPlaceholder('참여 캐릭터 선택')
            .setMinValues(0)
            .setMaxValues(possibleCharacterList.length)
            .addOptions(
                ...selectOptions
            );

        const row = new ActionRowBuilder()
            .addComponents(playerSelection);

        const response = await interaction.reply({
            content: `${selectedRaid.raid_name}에 참여하는 캐릭터 선택`,
            components: [row],
            ephemeral: true
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if (confirmation.customId === 'playerSelection') {
                const selectedPlayers = confirmation.values.map(v => JSON.parse(v));

                await loabot_db.deleteAllRaidParticipant(interaction.user.username, selectedRaid.raid_name);
                for (const character of selectedPlayers) {
                    await loabot_db.addRaidParticipant(character[0], selectedRaid.raid_name);
                }
                await interaction.client.updateRole(interaction);

                await confirmation.update({
                    content: "저장 완료!",
                    components: []
                });
            } else {
                console.log("이럴 수가 없는데..");
                await interaction.deleteReply();
            }
        } catch (err) {
            interaction.client.writeLog(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            console.log(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            await interaction.editReply({ content: '입력 시간 초과 (1분) 또는 에러 발생', components: [] });
        }
    },
}
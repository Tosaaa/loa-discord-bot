module.exports = async (interaction) => {
        const characterList = await loabot_db.getCharacters(interaction.user.username);
        if (!characterList.length) {
            await interaction.reply({
                content: "캐릭터 리스트 받아오기 실패. \n캐릭터 연동을 확인해주세요.",
                ephemeral: true
            });
            return;
        }
    
        await interaction.deferReply({ephemeral: true});
    
        let raidList = await loabot_db.getRaidList();
        for (const selectedRaid of raidList) {
            const possibleCharacterList = characterList.filter(character => character[2] >= selectedRaid.required_item_level);
            if (possibleCharacterList.length === 0) continue;
    
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
                .setCustomId(`${selectedRaid.raid_name}newPlayerSelection`)
                .setPlaceholder(`${selectedRaid.raid_name} 참여 캐릭터 선택`)
                .setMinValues(0)
                .setMaxValues(possibleCharacterList.length)
                .addOptions(
                    ...selectOptions
                );
    
            const row = new ActionRowBuilder()
                .addComponents(playerSelection);
    
            const response = await interaction.followUp({
                content: `${selectedRaid.raid_name}에 참여하는 캐릭터 선택`,
                components: [row],
                ephemeral: true
            });
        }
    }
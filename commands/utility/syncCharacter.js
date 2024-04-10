const { SlashCommandBuilder } = require('discord.js');
const { API_KEY } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('캐릭터연동')
        .setDescription('본인 캐릭터 연동 (부계정 있으면 둘 다 입력)')
        .addStringOption(option => 
            option.setName("캐릭터닉네임")
                .setDescription("캐릭터 닉네임")
                .setRequired(true))
        .addStringOption(option => 
          option.setName("부캐릭터닉네임")
              .setDescription("부계 캐릭터 닉네임(선택)")),
    
    async execute(interaction) {
        const playerName = interaction.options.getString("캐릭터닉네임");
        const subPlayerName = interaction.options.getString("부캐릭터닉네임");

        let playerNameList = [playerName];
        if (subPlayerName) {
          playerNameList.push(subPlayerName);
        }

        const success = await interaction.client.updateCharacter(interaction.user.username, playerNameList);
        if (!success) {
            await interaction.reply({
                content: "캐릭터 연동 실패, 닉네임이 올바른지 확인해주세요.",
                ephemeral: true
            });
            return;
        } else {
            await interaction.reply({
                content: "캐릭터 연동 완료!",
                ephemeral: true
            });
            return;
        }
    }
}
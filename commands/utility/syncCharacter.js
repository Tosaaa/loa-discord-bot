const { SlashCommandBuilder } = require('discord.js');
const logger = require('../../logger.js');
const loabot_db = require('../../functions/loabot_db/db_sql.js');

module.exports = {
    data: async () => {
        return new SlashCommandBuilder()
        .setName('캐릭터연동')
        .setDescription('본인 캐릭터 연동 (여러 번 연동 가능)')
        .addStringOption(option => 
            option.setName("캐릭터닉네임")
                .setDescription("캐릭터 닉네임")
                .setRequired(true))
        .addStringOption(option => 
          option.setName("부캐릭터닉네임")
              .setDescription("부계 캐릭터 닉네임(선택)"));
    },
    
    async execute(interaction) {
        try {
            const playerName = interaction.options.getString("캐릭터닉네임");
            const subPlayerName = interaction.options.getString("부캐릭터닉네임");

            let playerNameList = [playerName];
            if (subPlayerName) {
            playerNameList.push(subPlayerName);
        }   

            await loabot_db.syncCharacter(interaction.user.username, playerNameList);
            await interaction.reply({
                content: "캐릭터 연동 완료!",
                ephemeral: true
            });
        } catch (err) {
            logger.error(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            console.error(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            await interaction.reply({
                content: `캐릭터연동 실패: ${err}`,
                ephemeral: true
            });
        }
        return;
    }
}
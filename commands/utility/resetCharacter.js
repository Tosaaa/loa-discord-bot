const { SlashCommandBuilder } = require('discord.js');
const { API_KEY } = require('../../config.json');
const loabot_db = require('../../functions/loabot_db/db_sql.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('캐릭터연동초기화')
        .setDescription('본인의 연동된 캐릭터 초기화'),
    
    async execute(interaction) {
        try {
            await loabot_db.resetCharacter(interaction.user.username);
            await interaction.reply({
                content: "캐릭터 연동 초기화 완료!",
                ephemeral: true
            });
        } catch (err) {
            interaction.client.writeLog(`${interaction.commandName}, ${interaction.user.username}: ${err}`);
            await interaction.reply({
                content: `캐릭터 연동 초기화 실패: ${err}`,
                ephemeral: true
            });
        }
        return;
    }
}
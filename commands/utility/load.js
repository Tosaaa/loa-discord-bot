//TODO: json파일에서 백업된 데이터 로드

const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('데이터로드')
        .setDescription('디버그용 데이터 로드 (개발자용)'),
    
    async execute(interaction) {
        if (interaction.user.username !== 'tosaaa') {
            await interaction.reply({
                content: "권한이 없습니다",
                ephemeral: true
            });
            return;
        }
        const client = interaction.client;
        console.log("********************[LOAD_BEGIN]********************")
        console.log("raidParticipant: \n", interaction.client.raidParticipant);
        console.log("characterSync: \n", interaction.client.characterSync);
        console.log("********************[LOAD_END]********************")

        await interaction.reply({
            content: "콘솔에 출력되었음!",
            ephemeral: true
        });
    },
}

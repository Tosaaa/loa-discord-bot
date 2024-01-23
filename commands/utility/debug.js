const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('디버그')
        .setDescription('디버그용 데이터 출력 (개발자용)'),
    
    async execute(interaction) {
        const client = interaction.client;
        console.log("********************[DEBUG_BEGIN]********************")
        console.log("raidParticipant: \n", interaction.client.raidParticipant);
        console.log("characterSync: \n", interaction.client.characterSync);
        console.log("********************[DEBUG_END]********************")

        await interaction.reply({
            content: "콘솔에 출력되었음!",
            ephemeral: true
        });
    },
}

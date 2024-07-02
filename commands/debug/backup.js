const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: async () => {
        return new SlashCommandBuilder()
        .setName('데이터백업')
        .setDescription('디버그용 데이터 백업 (개발자용)');
    },
    
    async execute(interaction) {
        if (interaction.user.username !== 'tosaaa') {
            await interaction.reply({
                content: "권한이 없습니다",
                ephemeral: true
            });
            return;
        }

        interaction.client.dataBackup();

        await interaction.reply({
            content: "데이터 백업 완료!",
            ephemeral: true
        });
    },
}

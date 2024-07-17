const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: async () => {
        return new SlashCommandBuilder()
        .setName('사용법')
        .setDescription('로아봇 사용법');
    },
    
    async execute(interaction) {
        const client = interaction.client;

        let result = `[로아봇 사용법]\n`;
        for (const [commandKey, commandValue] of [...client.commands]) {
            let command = await commandValue.data();
            if (command.description.includes("개발자용")) return;
            result += `/**${commandKey}**\n`;
            result += ` : ${command.description}\n`;
        }

        await interaction.reply({
            content: result,
            ephemeral: true
        });
    },
}

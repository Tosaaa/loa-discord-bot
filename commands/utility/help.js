const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('사용법')
        .setDescription('로아봇 사용법'),
    
    async execute(interaction) {
        const client = interaction.client;

        let result = `[로아봇 사용법]\n`;

        [...client.commands].forEach(([commandKey, commandValue])=> {
            if (commandValue.data.description.includes("개발자용")) return;
            result += `/**${commandKey}**\n`;
            result += ` : ${commandValue.data.description}\n`;
        });

        await interaction.reply({
            content: result,
            ephemeral: true
        });
    },
}

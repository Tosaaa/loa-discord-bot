const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: async () => {
        return new SlashCommandBuilder()
        .setName('쌀')
        .setDescription('쌀산기')
        .addIntegerOption(option => 
            option.setName('몇인')
                .setDescription('몇인 레이드?')
                .setRequired(true)
                .addChoices(
                    {name: "4인", value: 4},
                    {name: "8인", value: 8},
                    {name: "16인", value: 16}
                ))
        .addIntegerOption(option => 
            option.setName('경매가')
                .setDescription('경매 최저가')
                .setRequired(true));
    },
    
    async execute(interaction) {
        const divider = interaction.options.getInteger('몇인');
        const auctionValue = interaction.options.getInteger('경매가');
        
        const equalValue = (auctionValue * 0.95) * (divider-1) / divider;
        const preemptionValue = equalValue / 1.1;

        const res = `경매가 ${auctionValue}, ${divider}인 기준 \n공평: ${equalValue.toFixed(2)} \n선점: ${preemptionValue.toFixed(2)}`;

        const response = await interaction.reply({
            content: res
        });
    },
};
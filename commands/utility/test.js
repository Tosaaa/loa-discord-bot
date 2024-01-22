const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('테스트'),
    async execute(interaction) {
        const allMembersMap = await interaction.guild.members.fetch();
        const allMembers = [...allMembersMap.values()];
        const allRolesMap = await interaction.guild.roles.fetch();
        const allRoles = [...allRolesMap.values()];

        // clear all roles
        allMembers.forEach(member => {
            allRoles.forEach(async role => {
                if (!member.user.bot && role.name !== "@everyone" && role.name !== "로아봇") {
                    await member.roles.remove(role);
                }
            });
        });

        // add all roles
        // allMembers.forEach(member => {
        //     allRoles.forEach(async role => {
        //         if (!member.user.bot && role.name !== "@everyone" && role.name !== "로아봇") {
        //             await member.roles.add(role);
        //         }
        //     });
        // });

        await interaction.reply({content: "역할 수정 완료!", ephemeral: true});
    },
}
const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // await client.user.setAvatar('DB/loabot_icon.png');
        // displaying client under maintanence
        //client.user.setPresence({ activities: [{ name: '수리' }], status: 'dnd' });
	},
}

const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);

        // displaying client under maintanence
        // client.user.setPresence({ activities: [{ name: '수리' }], status: 'dnd' });
	},
}
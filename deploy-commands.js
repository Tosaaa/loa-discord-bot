const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const loabot_db = require('./functions/loabot_db/db_sql.js');

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// rest.delete(Routes.applicationGuildCommand(clientId, guildId, 'ping'))
// 	.then(() => console.log('Successfully deleted guild command'))
// 	.catch(console.error);

// and deploy your commands!
(async () => {
	const commands = [];
	// Grab all the command folders from the commands directory you created earlier
	const foldersPath = path.join(__dirname, 'commands');
	const commandFolders = fs.readdirSync(foldersPath);
	
	for (const folder of commandFolders) {
		// Grab all the command files from the commands directory you created earlier
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				commands.push((await command.data()).toJSON());
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}

	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
            // Routes.applicationCommands(clientId),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);

		// End pool before exit (process won't exit without it)
		loabot_db.pool.end(function(err) {
			if (err) console.log(err);
		});
		
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
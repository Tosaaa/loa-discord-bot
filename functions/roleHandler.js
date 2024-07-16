const { guildId } = require('../config.json');
const loabot_db = require('./loabot_db/db_sql.js');
const logger = require('../logger.js');

module.exports = {
    initRole: async function() {
		try {
			const allMembersMap = await this.guilds.cache.get(guildId).members.fetch();
			const allMembers = [...allMembersMap.values()];
			const allRolesMap = await this.guilds.cache.get(guildId).roles.fetch();
			const allRoles = [...allRolesMap.values()];
		
			const raidList = await loabot_db.getRaidList();
		
			allMembers.forEach(async member => {
				const oldRoles = [];
				const newRoles = [];
		
				for (const raid of raidList) {
					const raidRole = allRoles.find(role => role.name === raid.raid_name);
					if (!raidRole) return;
					
					if([...member.roles.cache.keys()].includes(raidRole.id)) {
						oldRoles.push(raidRole);
					}
		
					const characters = await loabot_db.getCharacters(member.user.username);
					for (const character of characters) {
						if (await loabot_db.isRaidParticipant(character[0], raid.raid_name)) {
							newRoles.push(raidRole);
							break;
						}
					}
				}
				
				const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
				const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
				roleToAdd.forEach(role => member.roles.add(role));
				roleToRemove.forEach(role => member.roles.remove(role));
			});
		} catch (err) {
			logger.error(err);
			console.error(err);
		}
	},
    
    updateRole: async function(interaction) {
		try {
			const allRolesMap = await interaction.guild.roles.fetch();
			const allRoles = [...allRolesMap.values()];
		
			const raidList = await loabot_db.getRaidList();
		
			const member = interaction.member;
			const oldRoles = [];
			const newRoles = [];
		
		
			for (const raid of raidList) {
				const raidRole = allRoles.find(role => role.name === raid.raid_name);
				if (!raidRole) return;
				
				if([...member.roles.cache.keys()].includes(raidRole.id)) {
					oldRoles.push(raidRole);
				}
		
				const characters = await loabot_db.getCharacters(member.user.username);
				for (const character of characters) {
					if (await loabot_db.isRaidParticipant(character[0], raid.raid_name)) {
						newRoles.push(raidRole);
						break;
					}
				}
			}
			
			const roleToAdd = newRoles.filter(newRole => !oldRoles.map(oldRole => oldRole.id).includes(newRole.id));
			const roleToRemove = oldRoles.filter(oldRole => !newRoles.map(newRole => newRole.id).includes(oldRole.id));
			roleToAdd.forEach(role => member.roles.add(role));
			roleToRemove.forEach(role => member.roles.remove(role));
		} catch (err) {
			logger.error(err);
			console.error(err);
		}
    }
}
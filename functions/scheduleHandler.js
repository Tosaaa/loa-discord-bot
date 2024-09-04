const schedule = require('node-schedule');
const loabot_db = require('./loabot_db/db_sql');
const { channelId, channelIdLaboratory, channelIdRaidSelection } = require('../config.json');
const logger = require('../logger');

module.exports = {
    getScheduleJob: (time_string, callback) => {
        return schedule.scheduleJob(time_string, callback);
    },

    doResetRaid: async function () {
        try {
            const client = this;

            await loabot_db.resetRaidParticipant();
            await client.initRole();
            // const channel = client.channels.cache.get(channelId);
            // await channel.send(`레이드 초기화 완료!`);
        } catch (err) {
            logger.error(err);
            console.error(err);
        }
        
    },

    doUpdateAllCharacters: async function () {
        try {
            await loabot_db.updateAllCharacters();
        } catch (err) {
            logger.error(err);
            console.error(err);
        }
    }
}
const schedule = require('node-schedule');
const loabot_db = require('./loabot_db/db_sql');
const { channelId, channelIdLaboratory, channelIdRaidSelection } = require('../config.json');

module.exports = {
    getScheduleJob: (time_string, callback) => {
        return schedule.scheduleJob(time_string, callback);
    },

    doResetRaid: async function () {
        const client = this;

        await loabot_db.resetRaidParticipant();
        await client.initRole();
        const channel = client.channels.cache.get(channelIdLaboratory);
        await channel.send(`레이드 초기화 완료!`);
    },

    doUpdateAllCharacters: async function () {
        await loabot_db.updateAllCharacters();
    }
}
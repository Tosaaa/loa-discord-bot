const mariadb = require('mariadb/callback');
const {db, token} = require('../../config.json')

module.exports = function () {
  const pool = mariadb.createPool({
    host: db.host,
    user: db.user,
    password: token, // DISCORD_TOKEN
    database: db.database,
    connectionLimit: 10 // default
  });

  return {
    getConnection: (callback) => {
      pool.getConnection(callback);
    },
    
    end: callback => {
      pool.end(callback);
    }
  }
}();
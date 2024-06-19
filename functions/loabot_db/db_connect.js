const mysql = require('mysql');
const {db, token} = require('../../config.json')

module.exports = function () {
  const pool = mysql.createPool({
    host: db.host,
    user: db.user,
    password: token, // DISCORD_TOKEN
    database: db.database
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
const pool = require('./db_connect');

module.exports = function () {
    _do_query = (SQL_QUERY) => {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, con) => {
                con.query(SQL_QUERY, (err, data) => {
                    con.release();
                    if (err) reject(err);
                    resolve(data);
                });
            });
        });
    }

    return {
        selectAllClasses: async () => {
            try {
                let data = await _do_query('SELECT * FROM classes');
                console.log(data);
            } catch(err) {
                console.log(err);
            }
        },
        pool: pool
    };
}();

const pool = require('./db_connect');

module.exports = function () {
    _do_query = (SQL_QUERY, callback) => {
        pool.getConnection((err, con) => {
            con.query(SQL_QUERY, (err, data) => {
                con.release();
                if (err) return callback(err);
                callback(null, data);
            });
        });
    }

    return {
        selectAllClasses: (callback) => {
            const SQL_QUERY = 'SELECT * FROM classes';
            _do_query(SQL_QUERY, callback);
        },
        
        pool: pool
    };
}();

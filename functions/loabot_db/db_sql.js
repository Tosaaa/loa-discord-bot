const logger = require('../../logger.js');
const pool = require('./db_connect');
const parseCharacters = require('../parseCharacters.js');

module.exports = function () {
    _get_con = () => {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, con) => {
                if (err) reject(err);
                resolve(con);
            });
        });
    };

    _release_con = (con) => {
        con.release();
    }

    _do_query = (con, SQL_QUERY, PARAMS) => {
        return new Promise((resolve, reject) => {
            con.query(SQL_QUERY, PARAMS, (err, data) => {
                if (err) reject(err);
                resolve(data);
            });
        });
    };

    executeQuery = async (callback) => {
        const con = await _get_con();
        try {
            await _do_query(con, `START TRANSACTION`);
            const result = await callback(con);
            await _do_query(con, `COMMIT`);
            _release_con(con);
            return result;
        } catch (err) {
            await _do_query(con, `ROLLBACK`);
            _release_con(con);
            throw err;
        }
    };

    const funcs = {};
    ///////////////////////////////////
    // 각 함수는 실패할 수 있고, 사용자는 에러 처리를 해줘야 함.
    funcs.syncCharacter = (discord_id, playerNameList) => {
        return executeQuery(async (con) => {
            let characterList = [];
            for (const playerName of playerNameList) 
                characterList = characterList.concat(await parseCharacters(playerName));
            if (!characterList.length) throw new Error("해당 캐릭터가 존재하지 않습니다.");
    
            // 유저 추가 (있으면 무시)
            await _do_query(con, `INSERT IGNORE INTO users VALUE (?)`, [discord_id]);
            for await (const character of characterList) {
                // class_name 있나 확인
                let class_id = (await _do_query(con, `SELECT class_id FROM classes WHERE class_name = ?`, [character[1]]))[0]?.class_id;
                if (!class_id) throw new Error("클래스 조회 불가");
                // characters에 있나 확인, 없으면 추가하고 있으면 템렙 업데이트
                let data = await _do_query(con, `SELECT * FROM characters WHERE character_name = ?`, [character[0]]);
                if (!data.length) {
                    await _do_query(con, `INSERT INTO characters (discord_id, character_name, class_id, item_level) VALUE (?, ?, ?, ?)`, [discord_id, character[0], class_id, character[2]]);
                } else {
                    await _do_query(con, `UPDATE characters SET item_level = ? WHERE character_name = ?`, [character[2], character[0]]);
                }
            }
            // 대표 캐릭터 추가
            await _do_query(con, `DELETE FROM main_characters WHERE discord_id = ?`, [discord_id]);
            for (const main_character_name of playerNameList) {
                let data = (await _do_query(con, `SELECT character_id, discord_id FROM characters WHERE character_name = ?`, [main_character_name]))[0];
                let _character_id = data?.character_id;
                let _discord_id = data?.discord_id;
                if (_discord_id && _discord_id !== discord_id) {
                    throw new Error(`해당 캐릭터는 ${_discord_id}이/가 사용 중입니다.`);
                } else {
                    let main_character_id = _character_id;
                    await _do_query(con, `INSERT IGNORE INTO main_characters (discord_id, character_id) VALUE (?, ?)`, [discord_id, main_character_id]);
                }
            }
        });
    };

    funcs.resetCharacter = (discord_id) => {
        return executeQuery(async (con) => {
            // 1. 유저 있나 확인
            let data = await _do_query(con, `SELECT discord_id FROM users WHERE discord_id = ?`, [discord_id]);
            if (!data.length) {
                throw new Error("연동된 캐릭터가 없습니다.");
            } else {
                let data = (await _do_query(con, `SELECT character_id FROM characters WHERE discord_id = ?`, [discord_id]));
                for (const row of data) {
                    await _do_query(con, `DELETE FROM raid_participation WHERE character_id = ?`, [row.character_id]);
                }
                await _do_query(con, `DELETE FROM main_characters WHERE discord_id = ?`, [discord_id]);
                await _do_query(con, `DELETE FROM characters WHERE discord_id = ?`, [discord_id]);
                await _do_query(con, `DELETE FROM users WHERE discord_id = ?`, [discord_id]); // 근데 굳이 유저까지 지워야 할까?
            }
        });
    };

    funcs.getCharacters = (discord_id) => {
        return executeQuery(async (con) => {
            let data = await _do_query(con, `SELECT character_name, class_id, item_level FROM characters WHERE discord_id = ?`, [discord_id]);
            let res = [];
            for (const character of data) {
                let character_name = character.character_name;
                let class_name = (await _do_query(con, `SELECT class_name FROM classes WHERE class_id = ?`, [character.class_id]))[0]?.class_name;
                if (!class_name) throw new Error("클래스 조회 불가");
                let item_level = character.item_level;
                res.push([character_name, class_name, item_level]);
            }
            return res;
        });
    };

    funcs.addRaidParticipant = (character_name, raid_name) => {
        return executeQuery(async (con) => {
            let character_id = (await _do_query(con, `SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
            if (!character_id) throw new Error(`캐릭터 조회 불가: ${character_name}`);
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let status = (await _do_query(con, `SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
            if (status === "완료") {                        
                await _do_query(con, `UPDATE raid_participation SET status = '참여' WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
            } else if (status === "참여") {
                // do nothing
            } else {
                await _do_query(con, `INSERT INTO raid_participation VALUE (?, ?, '참여')`, [character_id, raid_id]);
            }
        });
    };

    funcs.completeRaidParticipant = (character_name, raid_name) => {
        return executeQuery(async (con) => {
            let character_id = (await _do_query(con, `SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
            if (!character_id) throw new Error(`캐릭터 조회 불가: ${character_name}`);
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let status = (await _do_query(con, `SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
            if (status === "참여") {                        
                await _do_query(con, `UPDATE raid_participation SET status = '완료' WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
            } else {
                // status가 참여가 아닌데 이 함수를 요청하는 상황. 일단 아무 것도 안함.
            }
        });
    };

    funcs.deleteRaidParticipant = (character_name, raid_name) => {
        return executeQuery(async (con) => {
            let character_id = (await _do_query(con, `SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
            if (!character_id) throw new Error(`캐릭터 조회 불가: ${character_name}`);
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let status = (await _do_query(con, `SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
            if (status) {      
                await _do_query(con, `DELETE FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
            }
        });
    };

    funcs.deleteAllRaidParticipant = (discord_id, raid_name) => {
        return executeQuery(async (con) => {
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let data = (await _do_query(con, `SELECT character_id FROM characters WHERE discord_id = ?`, [discord_id]));
            for (const row of data) {
                await _do_query(con, `DELETE FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [row.character_id, raid_id]);
            }
        });
    };

    funcs.isRaidParticipant = (character_name, raid_name) => {
        return executeQuery(async (con) => {
            let character_id = (await _do_query(con, `SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
            if (!character_id) throw new Error(`캐릭터 조회 불가: ${character_name}`);
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let status = (await _do_query(con, `SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
            return status === "참여";
        });
    };

    funcs.getRaidParticipant = (raid_name) => {
        return executeQuery(async (con) => {
            let raid_id = (await _do_query(con, `SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
            if (!raid_id) throw new Error(`레이드 조회 불가: ${raid_name}`);
            let character_ids = (await _do_query(con, `SELECT character_id FROM raid_participation WHERE raid_id = ? AND status = '참여'`, [raid_id]));
            let res = {};
            for (const character_id of character_ids) {
                let data = (await _do_query(con, `SELECT discord_id, character_name FROM characters WHERE character_id = ?`, [character_id.character_id]))[0];
                if (!data) continue;
                let discord_id = data.discord_id;
                let character_name = data.character_name;
                if (!res[discord_id]) 
                    res[discord_id] = [character_name];
                else 
                    res[discord_id].push(character_name);
            }
            return res;
        });
    };

    funcs.resetRaidParticipant = () => {
        return executeQuery(async (con) => {
            await _do_query(con, `TRUNCATE TABLE raid_participation`);
        });
    };

    funcs.getRaidList = () => {
        return executeQuery(async (con) => {
            let raidList = await _do_query(con, `SELECT raid_name, max_participants, required_item_level FROM raids ORDER BY required_item_level`);
            return raidList;
        });
    };

    funcs.isSupport = (discord_id) => {
        return executeQuery(async (con) => {
            let class_id = (await _do_query(con, `SELECT class_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.class_id;
            if (!class_id) throw new Error("클래스 조회 불가");
            let is_support = (await _do_query(con, `SELECT is_support FROM classes WHERE class_id = ?`, [class_id]))[0]?.is_support;
            if (!is_support) throw new Error("서포터 여부 조회 불가");
            return is_support;
        });
    };

    funcs.updateAllCharacters = () => {
        return executeQuery(async (con) => {
            let users = await _do_query(con, `SELECT * FROM users`);
            for (const user of users) {
                let character_ids = (await _do_query(con, `SELECT character_id FROM main_characters WHERE discord_id = ?`, [user.discord_id]));
                let playerNameList = [];
                for (const character of character_ids) {
                    let character_name = (await _do_query(con, `SELECT character_name FROM characters WHERE character_id = ?`, [character.character_id]))[0]?.character_name;
                    if (!character_name) throw new Error(`캐릭터 이름 조회 불가`);
                    playerNameList.push(character_name);
                }
                await funcs.syncCharacter(user.discord_id, playerNameList);
            }
        });
    };

    ///////////////////////////////////

    funcs.pool = pool;
    return funcs;
}();

const logger = require('../../logger.js');
const pool = require('./db_connect');
const { API_KEY } = require('../../config.json');

function fetchCharacters(playerName) {
    return new Promise(async (resolve, reject) => {
        let options = {
            'method': 'get',
            'headers': {
                'accept': 'application/json',
                'authorization': 'bearer ' + API_KEY
            }
            }
        let res = await fetch(`https://developer-lostark.game.onstove.com/characters/${playerName}/siblings`, options);
        if (res.status === 503) {
            reject("fetchCharacters: 로스트아크 API 서버가 응답이 없습니다.")
        } else {
            resolve(await res.json());
        }
    });
}

// 실패하면 빈 배열 [] 리턴, 사용자는 에러 처리 안 해도 됨.
async function parseCharacters(playerName) {
    try {
        let characters = await fetchCharacters(playerName);
        if (!characters) throw new Error("캐릭터 조회 실패");
        characters = characters.filter(character => {
            return parseFloat((character.ItemAvgLevel).replaceAll(",", "")) > 0;
        });
        characters.sort((a, b) => {
            return parseFloat((b.ItemAvgLevel).replaceAll(",", "")) - parseFloat((a.ItemAvgLevel).replaceAll(",", ""))
        });
        
        let result = [];
        for (let i = 0; i < characters.length; i++) {
            let char = characters[i];
            let CharacterName = char.CharacterName;
            let CharacterClassName = char.CharacterClassName;
            let ItemAvgLevel = parseFloat((char.ItemAvgLevel).replaceAll(",",""));
            result.push([CharacterName, CharacterClassName, ItemAvgLevel]);
        }
        return result;	
    } catch (err) {
        logger.error(err);
        return [];
    }
}


module.exports = function () {
    _do_query = (SQL_QUERY, PARAMS) => {
        return new Promise((resolve, reject) => {
            pool.getConnection((err, con) => {
                con.query(SQL_QUERY, PARAMS, (err, data) => {
                    con.release();
                    if (err) reject(err);
                    resolve(data);
                });
            });
        });
    };

    ///////////////////////////////////
    // 각 함수는 실패할 수 있고, 사용자는 에러 처리를 해줘야 함.
    syncCharacter = (discord_id, playerNameList) => {
        return new Promise(async (resolve, reject) => {
            try {
                // TRANSACTION 쓰면 비동기 처리하느라 race condition으로 중간에 멈춤 해결 필요
                // await _do_query(`START TRANSACTION`);
                let characterList = [];
                for (const playerName of playerNameList) 
                    characterList = characterList.concat(await parseCharacters(playerName));
                if (!characterList.length) reject("해당 캐릭터가 존재하지 않습니다.");
        
                // 유저 추가 (있으면 무시)
                await _do_query(`INSERT IGNORE INTO users VALUE (?)`, [discord_id]);
                for (const character of characterList) {
                    console.log(character);
                    // class_name 있나 확인
                    let class_id = (await _do_query(`SELECT class_id FROM classes WHERE class_name = ?`, [character[1]]))[0]?.class_id;
                    if (!class_id) reject("클래스 조회 불가");
                    console.log(1);
                    // characters에 있나 확인, 없으면 추가하고 있으면 템렙 업데이트
                    data = await _do_query(`SELECT * FROM characters WHERE character_name = ?`, [character[0]]);
                    console.log(2);
                    if (!data.length) {
                        await _do_query(`INSERT INTO characters (discord_id, character_name, class_id, item_level) VALUE (?, ?, ?, ?)`, [discord_id, character[0], class_id, character[2]]);
                        console.log(3);
                    } else {
                        await _do_query(`UPDATE characters SET item_level = ? WHERE character_name = ?`, [character[2], character[0]]);
                        console.log(4);
                    }
                    console.log(5);
                }
                // 대표 캐릭터 추가
                await _do_query(`DELETE FROM main_characters WHERE discord_id = ?`, [discord_id]);
                for (const main_character_name of playerNameList) {
                    data = (await _do_query(`SELECT character_id, discord_id FROM characters WHERE character_name = ?`, [main_character_name]))[0];
                    let _character_id = data?.character_id;
                    let _discord_id = data?.discord_id;
                    if (_discord_id &&_discord_id !== discord_id) {
                        reject(`해당 캐릭터는 ${_discord_id}이/가 사용 중입니다.`);
                    } else {
                        let main_character_id = _character_id;
                        await _do_query(`INSERT IGNORE INTO main_characters (discord_id, character_id) VALUE (?, ?)`, [discord_id, main_character_id]);
                    }
                }
                // await _do_query("COMMIT");
                resolve();
            } catch (err) {
                // await _do_query("ROLLBACK");
                reject(err);
            }
        });
    };

    resetCharacter = (discord_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                // 1. 유저 있나 확인
                let data = await _do_query(`SELECT discord_id FROM users WHERE discord_id = ?`, [discord_id]);
                if (!data.length) {
                    reject("연동된 캐릭터가 없습니다.");
                } else {
                    let data = (await _do_query(`SELECT character_id FROM characters WHERE discord_id = ?`, [discord_id]));
                    for (const row of data) {
                        await _do_query(`DELETE FROM raid_participation WHERE character_id = ?`, [row.character_id]);
                    }
                    await _do_query(`DELETE FROM main_characters WHERE discord_id = ?`, [discord_id]);
                    await _do_query(`DELETE FROM characters WHERE discord_id = ?`, [discord_id]);
                    await _do_query(`DELETE FROM users WHERE discord_id = ?`, [discord_id]); // 근데 굳이 유저까지 지워야 할까?
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    getCharacters = (discord_id) => {
        return new Promise(async (resolve, reject) => {
            try {
                let data = await _do_query(`SELECT character_name, class_id, item_level FROM characters WHERE discord_id = ?`, [discord_id]);
                let res = [];
                for (const character of data) {
                    let character_name = character.character_name;
                    let class_name = (await _do_query(`SELECT class_name FROM classes WHERE class_id = ?`, [character.class_id]))[0]?.class_name;
                    let item_level = character.item_level;
                    res.push([character_name, class_name, item_level]);
                }
                resolve(res);
            } catch (err) {
                reject(err);
            }
        });
    };

    addRaidParticipant = (character_name, raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {   
                let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                let status = (await _do_query(`SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
                if (status === "완료") {                        
                    await _do_query(`UPDATE raid_participation SET status = '참여' WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
                } else if (status === "참여") {
                    // do nothing
                } else {
                    await _do_query(`INSERT INTO raid_participation VALUE (?, ?, '참여')`, [character_id, raid_id]);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    completeRaidParticipant = (character_name, raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                let status = (await _do_query(`SELECT status FROM raid_participation WHERE character_id = ?`, [character_id]))[0]?.status;
                if (status === "참여") {                        
                    await _do_query(`UPDATE raid_participation SET status = '완료' WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
                } else {
                    // status가 참여가 아닌데 이 함수를 요청하는 상황. 일단 아무 것도 안함.
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    deleteRaidParticipant = (character_name, raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                let status = (await _do_query(`SELECT status FROM raid_participation WHERE character_id = ?`, [character_id]))[0]?.status;
                if (status) {      
                    await _do_query(`DELETE FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]);
                } else {
                    // do nothing
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    deleteAllRaidParticipant = (discord_id, raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let characterList = await getCharacters(discord_id);
                for (const character of characterList) {
                    await deleteRaidParticipant(character[0], raid_name);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    isRaidParticipant = (character_name, raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                let status = (await _do_query(`SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
                resolve(status === "참여");
            } catch (err) {
                reject(err);
            }
        });
    };

    getRaidParticipant = (raid_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                let character_ids = (await _do_query(`SELECT character_id FROM raid_participation WHERE raid_id = ? AND status = '참여'`, [raid_id]));
                let res = {};
                for (const character_id of character_ids) {
                    let data = (await _do_query(`SELECT discord_id, character_name FROM characters WHERE character_id = ?`, [character_id.character_id]))[0];
                    if (!data) continue;
                    let discord_id = data.discord_id;
                    let character_name = data.character_name;
                    if (!res[discord_id]) 
                        res[discord_id] = [character_name];
                    else 
                        res[discord_id].push(character_name);
                }
                resolve(res);
            } catch (err) {
                reject(err);
            }
        });
    };

    resetRaidParticipant = () => {
        return new Promise(async (resolve, reject) => {
            try {
                await _do_query(`TRUNCATE TABLE raid_participation`);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    getRaidList = () => {
        return new Promise(async (resolve, reject) => {
            try {
                let raidList = await _do_query(`SELECT raid_name, max_participants, required_item_level FROM raids ORDER BY required_item_level`);
                resolve(raidList);
            } catch (err) {
                reject(err);
            }
        });
    };

    isSupport = (character_name) => {
        return new Promise(async (resolve, reject) => {
            try {
                let class_id = (await _do_query(`SELECT class_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.class_id;
                let is_support = (await _do_query(`SELECT is_support FROM classes WHERE class_id = ?`, [class_id]))[0]?.is_support;
                resolve(is_support);
            } catch (err) {
                reject(err);
            }
        });
    };

    updateAllCharacters = () => {
        return new Promise(async (resolve, reject) => {
            try {
                let data = await _do_query(`SELECT * FROM users`);
                for (const row of data) {
                    let character_ids = (await _do_query(`SELECT character_id FROM main_characters WHERE discord_id = ?`, [row.discord_id]));
                    let playerNameList = [];
                    for (const row2 of character_ids) {
                        let character_name = (await _do_query(`SELECT character_name FROM characters WHERE character_id = ?`, [row2.character_id]))[0]?.character_name;
                        playerNameList.push(character_name);
                    }
                    await syncCharacter(row.discord_id, playerNameList);
                    console.log("UAC", row.discord_id, playerNameList);
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    __TEMPLATE = () => {
        return new Promise(async (resolve, reject) => {
            try {
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    };

    ///////////////////////////////////

    return {
        syncCharacter,
        resetCharacter,
        getCharacters,
        addRaidParticipant,
        completeRaidParticipant,
        deleteRaidParticipant,
        deleteAllRaidParticipant,
        isRaidParticipant,
        getRaidParticipant,
        resetRaidParticipant,
        getRaidList,
        isSupport,
        updateAllCharacters,
        pool: pool
    };
}();

const pool = require('./db_connect');
const { API_KEY } = require('../../config.json');

async function fetchCharacters(playerName) {
	let options = {
	  'method': 'get',
	  'headers': {
		'accept': 'application/json',
		'authorization': 'bearer ' + API_KEY
	  }
	}
	let res = await fetch(`https://developer-lostark.game.onstove.com/characters/${playerName}/siblings`, options);
	return await res.json();
}

async function parseCharacters(playerName) {
	let characters = await fetchCharacters(playerName);
	if (!characters) return null;
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
    }

    return {
        syncCharacter: (discord_id, playerNameList) => {
            return new Promise(async (resolve, reject) => {
                let characterList = [];
                for (const playerName of playerNameList) 
                    characterList = characterList.concat(await parseCharacters(playerName));
                if (!characterList[0]) reject("해당 캐릭터가 존재하지 않습니다.");
           
                try {
                    // 1. 유저 있나 확인 및 없으면 추가
                    let data = await _do_query(`SELECT discord_id FROM users WHERE discord_id = ?`, [discord_id]);
                    if (!data.length) {
                        await _do_query(`INSERT INTO users VALUE (?, NULL)`, [discord_id]);
                    }
    
                    for (const character of characterList) {
                        // 2. class_name 있나 확인
                        let class_id = (await _do_query(`SELECT class_id FROM classes WHERE class_name = ?`, [character[1]]))[0]?.class_id;
                        if (!class_id) reject("클래스 조회 불가, 개발자에게 문의해주세요.");
    
                        // 3. characters에 있나 확인, 없으면 추가하고 있으면 템렙 업데이트
                        data = await _do_query(`SELECT * FROM characters WHERE character_name = ?`, [character[0]]);
                        if (!data.length) {
                            await _do_query(`INSERT INTO characters (discord_id, character_name, class_id, item_level) VALUE (?, ?, ?, ?)`, [discord_id, character[0], class_id, character[2]]);
                        } else {
                            await _do_query(`UPDATE characters SET item_level = ? WHERE character_name = ?`, [character[2], character[0]]);
                        }
                    }
    
                    // 4. 대표 캐릭터 업데이트
                    let main_character_name = playerNameList[0];
                    data = await _do_query(`SELECT character_id, discord_id FROM characters WHERE character_name = ?`, [main_character_name]);
                    let _character_id = data[0]?.character_id;
                    let _discord_id = data[0]?.discord_id;
                    if (_discord_id !== discord_id) {
                        reject(`해당 캐릭터는 ${_discord_id}이/가 사용 중입니다.`);
                    } else {
                        let main_character_id = _character_id;
                        await _do_query(`UPDATE users SET main_character_id = ? WHERE discord_id = ?`, [main_character_id, discord_id]);
                    }
                    resolve();
                } catch (err) {
                    console.log(err);
                    reject(err);
                }
            });
        },

        resetCharacter: (discord_id) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // 1. 유저 있나 확인
                    let data = await _do_query(`SELECT discord_id FROM users WHERE discord_id = ?`, [discord_id]);
                    if (!data.length) {
                        reject("연동된 캐릭터가 없습니다.");
                    } else {
                        await _do_query(`UPDATE users SET main_character_id = NULL WHERE discord_id = ?`, [discord_id]);
                        await _do_query(`DELETE FROM characters WHERE discord_id = ?`, [discord_id]);
                        await _do_query(`DELETE FROM users WHERE discord_id = ?`, [discord_id]); // 근데 굳이 유저까지 지워야 할까?
                    }
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        },

        getCharacters: (discord_id) => {
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
        },

        addRaidParticipant: (character_name, raid_name) => {
            return new Promise(async (resolve, reject) => {
                try {   
                    let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                    let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                    // 여기부터 구현
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        },

        deleteRaidParticipant: (character_name, raid_name) => {
            return new Promise(async (resolve, reject) => {
                try {
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        },

        isRaidParticipant: (character_name, raid_name) => {
            return new Promise(async (resolve, reject) => {
                try {
                    let character_id = (await _do_query(`SELECT character_id FROM characters WHERE character_name = ?`, [character_name]))[0]?.character_id;
                    let raid_id = (await _do_query(`SELECT raid_id FROM raids WHERE raid_name = ?`, [raid_name]))[0]?.raid_id;
                    let status = (await _do_query(`SELECT status FROM raid_participation WHERE character_id = ? AND raid_id = ?`, [character_id, raid_id]))[0]?.status;
                    resolve(status);
                } catch (err) {
                    reject(err);
                }
            });
        },

        __TEMPLATE: (discord_id) => {
            return new Promise(async (resolve, reject) => {
                try {
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        },

        pool: pool
    };
}();

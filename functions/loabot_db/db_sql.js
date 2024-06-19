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
        syncCharacter: async (discord_id, playerNameList) => {
            let characterList = [];
            for (const playerName of playerNameList) 
                characterList = characterList.concat(await parseCharacters(playerName));
            
            if (!characterList) return false;

            let main_character_name = playerNameList[0];
            let class_name, item_level;
            for (const character of characterList) {
                if (character[0] === main_character_name) {
                    class_name = character[1];
                    item_level = character[2];
                    break;
                }
            }

            try {
                // 1. 유저 있나 확인 및 없으면 추가
                let user = await _do_query(`SELECT discord_id FROM users WHERE discord_id = ${discord_id}`);
                if (!user) {
                    await _do_query(`INSERT INTO users ${discord_id, NULL}`);
                }

                for (const character of characterList) {
                    // 2. class_name 있나 확인
                    let class_id = await _do_query(`SELECT class_id FROM classes WHERE class_name = ${class_name}`)
                    if (!class_id) return false;
                    
                    // 3. characters에 있나 확인, 없으면 추가하고 있으면 템렙 업데이트
                    let exist = await _do_query(`SELECT * FROM characters WHERE character_name = ${character[0]}`);
                    if (!exist) {
                        await _do_query(`INSERT INTO characters (discord_id, class_name, class_id, item_level) VALUE (${discord_id}, ${character[1]}, ${class_id}, ${character[2]})`);
                    } else {
                        await _do_query(`UPDATE characters SET item_level = ${character[2]} WHERE character_name = ${character[0]}`);
                    }
                }

                // 4. 대표 캐릭터 업데이트
                let main_character_id = await _do_query(`SELECT character_id FROM characters WHERE character_name = ${main_character_name}`);
                await _do_query(`UPDATE users SET main_character_id = ${main_character_id} WHERE discord_id = ${discord_id}`);

            } catch(err) {
                console.log(err);
            }
        },

        pool: pool
    };
}();

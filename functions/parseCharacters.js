const logger = require('../logger.js');
const { API_KEY } = require('../config.json');


module.exports = function() {
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

    return parseCharacters;
}();



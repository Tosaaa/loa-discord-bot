const logger = require('../logger.js');
const { API_KEY } = require('../config.json');


module.exports = function() {
    function fetchCharacters(playerName, retries = 3) {
        return new Promise(async (resolve, reject) => {
            let options = {
                'method': 'get',
                'headers': {
                    'accept': 'application/json',
                    'authorization': 'bearer ' + API_KEY
                }
            };

            for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                    let res = await fetch(`https://developer-lostark.game.onstove.com/characters/${playerName}/siblings`, options);
                    
                    // 503 상태 코드 처리 (서버 다운)
                    if (res.status === 503) {
                        if (attempt === retries) {
                            reject("fetchCharacters: 로스트아크 API 서버가 응답이 없습니다.");
                        } else {
                            logger.warn(`fetchCharacters: 503 오류로 인해 재시도 중... (시도 ${attempt}/${retries})`);
                            await new Promise(r => setTimeout(r, 1000)); // 1초 후 재시도
                        }
                    }
                    // JSON 응답인지 확인 후 처리
                    else if (res.headers.get('content-type')?.includes('application/json')) {
                        resolve(await res.json());
                        break;
                    } else {
                        reject("fetchCharacters: JSON 형식이 아님");
                        break;
                    }
                } catch (err) {
                    // 네트워크 오류 처리
                    if (attempt === retries) {
                        reject(`fetchCharacters: 네트워크 오류 발생 - ${err.message}`);
                    } else {
                        logger.warn(`fetchCharacters: 네트워크 오류로 인해 재시도 중... (시도 ${attempt}/${retries})`);
                        await new Promise(r => setTimeout(r, 1000)); // 1초 후 재시도
                    }
                }
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



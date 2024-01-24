const { SlashCommandBuilder } = require('discord.js');
const { API_KEY } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('캐릭터연동')
        .setDescription('디스코드에 본인 캐릭터 연동')
        .addStringOption(option => 
            option.setName("캐릭터닉네임")
                .setDescription("대표 캐릭터 닉네임 입력")
                .setRequired(true)),
    
    async execute(interaction) {
        const playerName = interaction.options.getString("캐릭터닉네임");
        const characterList = await this.parseCharacters(playerName);
        if (!characterList) {
            await interaction.reply({
                content: "캐릭터 연동 실패, 닉네임이 올바른지 확인해주세요.",
                ephemeral: true
            });
        } else {
            interaction.client.characterSync[interaction.user.username] = characterList;
            await interaction.reply({
                content: "캐릭터 연동 완료!",
                ephemeral: true
            });
        }
        // console.log(interaction.client.characterSync);
    },

    async fetchCharacters(playerName) {
        let options = {
          'method': 'get',
          'headers': {
            'accept': 'application/json',
            'authorization': 'bearer ' + API_KEY
          }
        }
        let res = await fetch(`https://developer-lostark.game.onstove.com/characters/${playerName}/siblings`, options);
        return await res.json();
    },

    async parseCharacters(playerName) {
        let characters = await this.fetchCharacters(playerName);
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
}


  
  
  
  function loadCharacters() {
    // 인수를 셀 선택해서 받는 대신 직접 셀에 접근해서 하는 방식
    // SpreadsheetApp 이용
    let ss = SpreadsheetApp.getActiveSpreadsheet()
    let characterList = ss.getRange(SHEET_NAME + "!E6:F7").getValue();
    Logger.log(characterList);
    characterList = characterList.split(",").map(x => x.trim());
    let result = [];
    characterList.forEach(userName => result.push(getTopSixCharacters(userName)));
    let colMap = ["E", "F", "G", "H", "I", "J"];
    let levelCut1 = parseInt(ss.getRange(SHEET_NAME + "!C6").getValue());
    let levelCut2 = parseInt(ss.getRange(SHEET_NAME + "!C5").getValue());
    for (let i = 0; i < characterList.length; i++) {
      ss.getRange(SHEET_NAME + `!E${9+4*i}:J${11+4*i}`).setValues(result[i]);
      for (let j = 0; j < 6; j++) {
        let CharacterClassName = result[i][1][j];
        let ItemAvgLevel = parseFloat(result[i][2][j]);
        let color;
        if (["홀리나이트", "바드", "도화가"].includes(CharacterClassName)) {
          color = "#fef2cb";
        } else if (ItemAvgLevel > levelCut1) {
          color = "#f7caac";
        } else if (ItemAvgLevel > levelCut2) {
          color = "#deeaf6";
        } else {
          color = "#ffffff";
        }
        ss.getRange(SHEET_NAME + `!${colMap[j]}${9+4*i}:${colMap[j]}${11+4*i}`).setBackground(color);
      }
    }
  
    Browser.msgBox("캐릭터 업데이트 완료!");
  }
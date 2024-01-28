const { SlashCommandBuilder } = require('discord.js');
const { API_KEY } = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('캐릭터연동')
        .setDescription('본인 캐릭터 연동 (부계정 있으면 둘 다 입력)')
        .addStringOption(option => 
            option.setName("캐릭터닉네임")
                .setDescription("캐릭터 닉네임")
                .setRequired(true))
        .addStringOption(option => 
          option.setName("부캐릭터닉네임")
              .setDescription("부계 캐릭터 닉네임(선택)")),
    
    async execute(interaction) {
        const playerName = interaction.options.getString("캐릭터닉네임");
        const subPlayerName = interaction.options.getString("부캐릭터닉네임");

        let playerNameList = [playerName];
        if (subPlayerName) {
          playerNameList.push(subPlayerName);
        }
        let characterList = [];
        for (const playerName of playerNameList) {
          characterList = characterList.concat(await this.parseCharacters(playerName));
        }

        if (!characterList) {
            await interaction.reply({
                content: "캐릭터 연동 실패, 닉네임이 올바른지 확인해주세요.",
                ephemeral: true
            });
            return;
        }
        interaction.client.characterSync[interaction.user.username] = characterList;
        interaction.client.dataBackup();
        await interaction.reply({
            content: "캐릭터 연동 완료!",
            ephemeral: true
        });
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
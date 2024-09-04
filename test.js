const API_KEY = "";
let auctionOptions;
async function fetchAuctionOptions() {
	let options = {
	  'method': 'get',
	  'headers': {
		'accept': 'application/json',
		'authorization': 'bearer ' + API_KEY
	  }
	}
	const res = await fetch(`https://developer-lostark.game.onstove.com/auctions/options`, options);
	return await res.json();
}

async function fetchJewelry() {
    let options = {
        'method': 'post',
        'headers': {
          'accept': 'application/json',
          'authorization': 'bearer ' + API_KEY,
          'Content-Type': 'application/json'
        },
        'body': `{
            'ItemLevelMin': 0,
            'ItemLevelMax': 0,
            'ItemGradeQuality': null,
            'SkillOptions': [
              {
                'FirstOption': 25200,
                'SecondOption': null,
                'MinValue': null,
                'MaxValue': null
              }
            ],
            'EtcOptions': [
              {
                'FirstOption': null,
                'SecondOption': null,
                'MinValue': null,
                'MaxValue': null
              }
            ],
            'Sort': 'BIDSTART_PRICE',
            'CategoryCode': 210000,
            'CharacterClass': '블레이드',
            'ItemTier': null,
            'ItemGrade': null,
            'ItemName': '10레벨 멸화의 보석',
            'PageNo': 0,
            'SortCondition': 'ASC'
          }`
    }
    const res = await fetch(`https://developer-lostark.game.onstove.com/auctions/items`, options);
	return await res.json();
}

async function run() {
    let res = await fetchAuctionOptions();
    auctionOptions = res;
    // console.log(auctionOptions.SkillOptions.filter(opt => opt.Class === "블레이드"));
    res = await fetchJewelry();
    for (const entry of Object.values(res)) {
        console.log(entry, entry.Options);
    }
}

run();

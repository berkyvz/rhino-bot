require('dotenv').config()
const axios = require('axios').default;

const config = {
    "loltoken": process.env.LOLTOKEN,
    "baseURL": process.env.LOLBASEUREL || "https://tr1.api.riotgames.com"
}

async function getLatestVersion() {
    try {
        const resp = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json')
        return resp.data[0];
    } catch (e) {
        console.log(e);
        return '11.1.1';
    }
}

async function getAllChampions(lolVersion) {
    try {
        const response = await axios.get(`http://ddragon.leagueoflegends.com/cdn/${lolVersion}/data/tr_TR/champion.json`);
        return response.data.data;
    } catch (e) {
        console.log(e)
        return {};
    }
}

async function getChampionById(championId, lolVersion) {
    const champs = await getAllChampions(lolVersion);
    for (champ in champs) {
        if (champs[champ].key === championId) {
            return champs[champ];
        }
    }
}

async function getChampionByName(championName, lolVersion) {
    const champs = await getAllChampions(lolVersion);
    return champs[championName];
}


async function getSummonerInformationByName(summonerName) {
    summonerName = encodeURI(summonerName);
    try {
        const summonerInfo = await axios.get(`${config.baseURL}/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=${config.loltoken}`);
        return summonerInfo.data;
    } catch (e) {
        console.log(e);
        return {}
    }
}

async function getSummonerActiveMatch(summonerId) {
    try {
        const matchDetails = await axios.get(`${config.baseURL}/lol/spectator/v4/active-games/by-summoner/${summonerId}?api_key=${config.loltoken}`);
        return matchDetails.data;
    } catch (e) {
        return {}
    }
}

async function getSummonerMasteriesAtChamp(summonerId, champId, latestVersion) {
    champId = champId.toString();
    let champById = await getChampionById(`${champId}`, latestVersion);
    let champMasteries = {};
    try {
        const response = await axios.get(`${config.baseURL}/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerId}/by-champion/${champId}?api_key=${config.loltoken}`);
        champMasteries = response.data;
    } catch (e) {
        champMasteries = {}
    }
    champMasteries.champName = champById.name
    champMasteries.champImageUrl = `http://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${champById.image.full}`;
    return champMasteries;
}

async function getSummonerRankStatistics(summonerId){
    try {
        const response = await axios.get(`${config.baseURL}/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${config.loltoken}`);
        return response.data;
    } catch (e) {
        return [];
    }
}

module.exports.getDataAboutGame = async function createUserCurrentGameTableData(summonerName) {
    let latestVersion = await getLatestVersion();
    const user = await getSummonerInformationByName(summonerName);

    const currentMatch = await getSummonerActiveMatch(user.id);

    let team1 = [];
    let team2 = [];
    let unknown = [];

    for (summonersInMatch in currentMatch.participants) {
        const  selectedUser = currentMatch.participants[summonersInMatch];
        const currentChampAndSummonersMasteriesAtIt = await getSummonerMasteriesAtChamp(selectedUser.summonerId, selectedUser.championId, latestVersion);
        const leagueInfo = await getSummonerRankStatistics(selectedUser.summonerId);
        selectedUser.masteries = currentChampAndSummonersMasteriesAtIt;
        selectedUser.leagueInfo = leagueInfo;

        if (selectedUser.teamId === 100) {
            team1.push(selectedUser);
        }
        else if (selectedUser.teamId === 200) {
            team2.push(selectedUser);
        }
        else {
            unknown.push(selectedUser);
        }


    }


    return {team1:team1, team2:team2, unknown:unknown};
}



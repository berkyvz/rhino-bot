var search = require('youtube-search');
require('dotenv').config()

const config = {
    "token": process.env.GOOGLETOKEN
}

console.log("YOUTUBE MODULE IS RUNNING");

var opts = {
    maxResults: 1,
    type: 'video',
    key: config.token
};


module.exports.getYoutubeLink = async function getYoutubeLinkByQ(searchParameterString){
   let result = await search(searchParameterString, opts);
    if(result && result.results && result.results.length > 0){
        return result.results[0].link;
    }
    else{
        return;
    }

}

const Discord = require('discord.js');
const lol = require('./lol');
const youtubeSearch = require('./youtube');

require('dotenv').config()

const config = {
    "token": process.env.TOKEN,
    "prefix": process.env.PREFIX
}

const ytdl = require('ytdl-core');

const client = new Discord.Client();
client.login(config.token);

const commands = {
    "presentYourSelf": `${config.prefix}kimsin`,
    "hi": `${config.prefix}sa`,
    "playMusic": `${config.prefix}oynat`,
    "skipMusic": `${config.prefix}geç`,
    "stopMusic": `${config.prefix}dur`,
    "helpCommand": `${config.prefix}yardım`,
    "lol": `${config.prefix}lol`
}

const queue = new Map();



function botReady() {
    console.log("Rhino bot is running now.");
};

function whoAmI(message) {
    return message.channel.send("S.a. ben RhinoBot\nCommander Of The Software tarafından geliştirildim.\nYazar: Berk Yavuz")
}

async function playMusic(message, serverQueue) {
    
    //permission checks.
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
        return message.channel.send(
            `Müzik çalmak için uygun bir kanalda değilsin ${message.author.username}`
        );
    }
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "Bu kanala katılıp müzik çalabilmek için yetkim yok!"
        );
    }

    //taking arguments
    const args = message.content.trim().split(" ");
    let elements = args.filter(value => value !== '' );

    let url = "";
    if( elements.length === 1){
        return message.channel.send("Eksik arguman girişi yaptınız. Kullanmak için $play <youtube linki> yada $play <arama> şeklinde giriniz.");
    }
    else if ( elements.length === 2 && elements[1].startsWith("https://www.youtube.com/")){
        url = elements[1];
    }
    else{
        let queryString = "";
        elements.map((element, index) => {
            if(index > 0){
                queryString = queryString + element + " ";
            }
        });
        queryString = queryString.trim();
        url = await searchYoutube(queryString);
        if(!url){
            return message.channel.send("Aradığınız şey youtube üzerinde bulunamadı.");
        }
    }
    

    //TODO: Args.length e gore youtube search at!
    //await searchYoutube(queryString) => url döner!
    playMusicWithYDTL(url, serverQueue, message, voiceChannel);

}

async function playMusicWithYDTL(url, serverQueue, message, voiceChannel){
    let songInfo;
    try{
       songInfo = await ytdl.getInfo(url);
    }catch(e){
        console.log(e);
        return message.channel.send(
            "Loglarıma bakın bir sorun var (YouTube API seems down right now)."
        );
    }
    if(!songInfo){
        console.log("songInfo undefined geldi.");
        return message.channel.send(
            "Loglarıma bakın bir sorun var."
        );
    }

    
    let thumbnail = songInfo.videoDetails.thumbnails.length >= 2 && songInfo.videoDetails.thumbnails[2].url;

    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        thumbnail: thumbnail,
        channelName : songInfo.videoDetails.author.name,
        view: songInfo.videoDetails.viewCount,
    };

    if (!serverQueue) {
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true
        };

        queue.set(message.guild.id, queueContruct);
        queueContruct.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            play(message.guild, queueContruct.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return;
        }
    }
    else {
        serverQueue.songs.push(song);
        return message.channel.send(`Sıraya eklendi: ${song.title}`);
    }
}

function noCommandAvailable(message) {
    return message.channel.send(
        `Böyle bir komut bulunamadı yada bu şekilde kullanılamıyor ${message.author.username}. $yardim yazarak yeteneklerimi görebilirsin.`
    );
}

function helpCommands(message) {
    return message.author.send(
        `Senin için özelliklerimi aşağıda sunuyorum.
        \n${commands.presentYourSelf}: Kendimi sana tanıtırım.
        \n${commands.hi}: Selam bile veriyorum.
        \n${commands.playMusic}: Müzik çalarım.
        \n${commands.skipMusic}: Müziği geçerim.
        \n${commands.stopMusic}: Müziği bitiririm.
        \n${commands.helpCommand}: Yardim komutlarını yollar.
        \n${commands.lol}: Girdiğin veya bulunduğun oyun ile iligili basit bilgiler verir.`
    )
}

function executeMessages(message, serverQueue) {
    const args = message.content.split(" ");
    if (args[0] === commands.presentYourSelf) {
        whoAmI(message);
    }
    else if (args[0] === commands.playMusic) {
        playMusic(message, serverQueue);
    }
    else if (args[0] === commands.skipMusic) {
        skip(message, serverQueue);
    }
    else if (args[0] === commands.stopMusic) {
        stop(message, serverQueue);
    }
    else if (args[0] === commands.helpCommand) {
        helpCommands(message);
    }
    else if (args[0] === commands.hi) {
        return message.channel.send(`A.s. ${message.author.username}`);
    }
    else if (args[0] === commands.lol) {
        getInfoAboutCurrentLolGame(message);
    }
    else {
        noCommandAvailable(message);
    }
}

function getInfoAboutCurrentLolGame(message) {
    const args = message.content.split(" ");
    let username = '';
    for (let index = 1; index < args.length; index++) {
        const element = args[index];
        if (index === 1) {
            username = `${element}`;
        }
        else {
            username = `${username} ${element}`;
        }

    }
    lol.getDataAboutGame(username).then(response => {
        console.log(response);

        if(response.team1.length ===  0 || response.team2.length === 0){
            return message.channel.send(
                `Selam ${username}, şu anda aktif bir oyunda olmayabilir ya da bu kullanıcı bulunamıyor olabilir.`
            );
        }
        return message.channel.send(
            `Selam ${username}, işlem başarılı fakat henüz tam olarak geliştirmem bitmedi.`
        );

    }).catch(e => {
        return message.channel.send(
            `Selam ${username}, aktif bir oyunda olmayabilir, kullanıcı adını hatalı girmiş olabilir, yada sistemde bir arıza çıkmış olabilir.`
        );
    });

    return {};

}




client.once('ready', () => {
    botReady();
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.on('message', async message => {
    if (!message.content.startsWith(config.prefix)) return;

    try {
        const serverQueue = queue.get(message.guild.id);
        executeMessages(message, serverQueue)
    } catch (error) {
        return message.channel.send(`Girdiğin komut hatalı yada özelden yazıyorsun ${message.author.username}. Lütfen sadece botun bulunduğu ortak kanal üzerinden yazınız.`);
    }
});


function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

    const exampleEmbed = new Discord.MessageEmbed()
	.setColor('#ffffff')
	.setTitle(`${song.title}`)
	.setURL(`${song.url}`)
    .addFields(
		{ name: 'OYNATILIYOR', value: '.' },
		{ name: '\u200B', value: '\u200B' },
		{ name: 'Kanal', value: `${song.channelName}`, inline: true },
		{ name: 'İzlenme', value: `${song.view}`, inline: true },
	)
	.setThumbnail(`${song.thumbnail}`)
	.setTimestamp()
	.setFooter('Botun Kralı', 'https://raw.githubusercontent.com/berkyvz/rhino-bot/master/rhino.jpg');

    serverQueue.textChannel.send(exampleEmbed);
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Müziği geçmek için ilgili kanalda bulunmalısınız!"
        );
    if (!serverQueue) {
        return message.channel.send("Listede geçebileceğim bir müzik mevcut değil.");
    }
    if (serverQueue.songs.length === 1) {
        serverQueue.connection.dispatcher.end();
        return message.channel.send("Listede geçebileceğim bir müzik mevcut değil.");
    }

    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "Müziği durdurmak için ilgili kanalda bulunmalısınız."
        );

    if (!serverQueue) {
        return message.channel.send("Canısı müzik çalmıyor zaten.");
    }

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
    return message.channel.send("Liste temizlendi ve müzik kapatıldı. AEO!")
}

async function searchYoutube(text){
    return await youtubeSearch.getYoutubeLink(text);
}
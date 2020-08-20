/* RUNNING IN NODE JS:
1) npm start

Bot token has also been revoked and replaced by Now secrets accordingly
*/

//================LIBRARIES AND VARIABLES=================//

//Initialising of Libraries for Telegram Bot
const { Markup, Extra } = require('micro-bot');
const Telegraf = require('micro-bot');

const bot = new Telegraf(process.env.BOT_TOKEN, { username: "SamStudiosBot" });
bot.use(Telegraf.log());

//Express Server to Handle Score Request from games
const Router = require('router');
const router = Router();
const bodyParser = require('body-parser');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler')

//const express = require('express');
//const app = express();

//Callback Queries (Primary query handler)
bot.on('callback_query', (ctx)=>{
	let cb = ctx.callbackQuery;

	if(typeof cb.game_short_name === "undefined"){
		ctx.replyWithGame(cb.data);
		return ctx.answerCbQuery(cb.data.toString().fromTitleCase()+" selected!");
	}

	let urlName = cb.game_short_name;

	//TODO: Get game highscores and use it for the app
	let _data = {
		"userID": ctx.from.id
	};

	if(cb.inline_message_id){
		_data["inlineMessageID"] = cb.inline_message_id;
	}
	else {
		_data["chatID"] = ctx.chat.id;
		_data["messageID"] = cb.message.message_id;
	}

	let gameURL = getGameURL(urlName, _data);

	if(gameURL){
		return ctx.answerGameQuery(gameURL);
	}
	else{ //error or not found
		return ctx.answerCbQuery("Game "+cb.game_short_name+" not found");
	}
});

//Inline Queries (ie which game to select)
const validGames = [ "SoaringSheep", "SisyphusSheep" ];
const inlineGameButtons = validGames.map((nm) => Markup.callbackButton(
	nm.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'),
	nm
));

bot.on('inline_query', (ctx)=>{
	let _id = 0;
	let qry = ctx.inlineQuery.query.toLowerCase();

	let results = validGames
		.filter((item)=>{
			return item.toLowerCase().indexOf(qry)!=-1 || qry.length<=0;
		})
		.map((_game)=> ({
			id: _id++, //need to set an ID
			type: "game",
			game_short_name: _game
		}));

	return ctx.answerInlineQuery(results);
});

//Bot Commands
bot.command('start', (ctx)=>{
	return ctx.reply(
		"<b>Select a Game to Play!</b>",
		Extra.HTML().markup(
			(m) => m.inlineKeyboard(inlineGameButtons, { columns: 2 })
		)
	);
});

//Get Game URL
const BASE_URL = "https://samstudiosbot.herokuapp.com";
console.log(process.env);

let getGameURL = (nm, data) => {
	let found = validGames.find(el => el === nm);

	if(!found) return false;

	let dataString = (data.inlineMessageID)?`&inlineMessageID=${data.inlineMessageID}`:`&chatID=${data.chatID}&messageID=${data.messageID}`;

	let gameUrl = "";

	switch (nm) {
		//Only consider the special cases
		//case: ?? return ??
		default:
			gameUrl = `${BASE_URL}/${nm}/?userID=${data.userID}`+dataString;
	}

	return gameUrl;
}

//================SERVER QUERIES FOR SETTLING HIGHSCORES=================//
router.use(serveStatic('static'));

const scoreRoute = router.route('/score');
scoreRoute.all(bodyParser.json());

scoreRoute.post((req, res, next) => {
	let gameName = req.body.game;

	if(!validGames.find(el => el === gameName)){
		console.log(gameName+" Game not found");
		return next();
	}

        console.log("Got something", gameName, req.body.score);

	//Set Game Score accordingly
	//TODO: Handle errors better.
	bot.telegram.setGameScore(req.body.userID, req.body.score, req.body.inlineMessageID, req.body.chatID, req.body.messageID, true)
		.then((score) =>{
			console.log('Leaderboard: '+JSON.stringify(score));
			res.statusCode = 200;
			res.end();
		}).catch((err) =>{
			console.log('[ERROR] '+err);
			res.statusCode = err.code || 500;
			res.end(err.description);
		});
});
//================EXPORT BOT=================//
//module.exports = bot;
module.exports = {
	botHandler: bot,
	requestHandler: (req, res) => router(req, res, finalhandler(req, res))
}

//================MISC. FUNCTIONS=================//
//Logging
log = (msg, type)=>{
	type = type || "DEBUG";

	console.log("["+type+"] "+msg);
}

//Get random integer: [min,max]
getRandomInt = (min, max)=>{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

//Get random float: [min,max)
getRandomFloatExcl = (min, max)=>{
    return Math.random() * (max - min) + min;
}

//Remove duplicates in array
removeDuplicates = (_array)=>{
	let _i, arr = [];
	let found = false;
	for(_i=0;_i<_array.length;_i++){
		found = false;
		for(_j=0;_j<arr.length;_j++){
			if(_array[_i] == arr[_j] || ( JSON.stringify(_array[_i]) == JSON.stringify(arr[_j]) && typeof _array[_i] == typeof arr[_j]) ){
				found=true;
				break;
			}
		}
		if(!found) arr.push(_array[_i]);
	}

	return arr;
}

String.prototype.toTitleCase = function() {
  var i, j, str, lowers, uppers;
  str = this.replace(/([^\W_]+[^\s-]*) */g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });

  // Certain minor words should be left lowercase unless
  // they are the first or last words in the string
  lowers = ['A', 'An', 'The', 'And', 'But', 'Or', 'For', 'Nor', 'As', 'At',
  'By', 'For', 'From', 'In', 'Into', 'Near', 'Of', 'On', 'Onto', 'To', 'With'];
  for (i = 0, j = lowers.length; i < j; i++)
    str = str.replace(new RegExp('\\s' + lowers[i] + '\\s', 'g'),
      function(txt) {
        return txt.toLowerCase();
      });

  // Certain words such as initialisms or acronyms should be left uppercase
  uppers = ['Id', 'Tv'];
  for (i = 0, j = uppers.length; i < j; i++)
    str = str.replace(new RegExp('\\b' + uppers[i] + '\\b', 'g'),
      uppers[i].toUpperCase());

  return str;
}

String.prototype.fromTitleCase = function() {
    str = this.replace(/([a-z])([A-Z])/g, '$1 $2');
    str = str.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    return str;
}

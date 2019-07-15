/* RUNNING IN NODE JS:
1) now -e BOT_TOKEN='633536414:AAENJwkQwYN3TGOe3LmFw2VyJFr8p7dU9II' --public
2) npm start
(Note that (2) will run (1) as defined in the start script)

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

//Callback Queries
bot.on('callback_query', (ctx)=>{
	let cb = ctx.callbackQuery;

	if(typeof cb.game_short_name === "undefined"){
		ctx.replyWithGame(cb.data);
		return ctx.answerCbQuery(cb.data.toString().fromTitleCase()+" selected!");
	}

	let urlName = cb.game_short_name;

	//console.log("CTX", JSON.stringify(ctx, null, 2));
	console.log(cb.message.chat.id, cb.chat_instance, ctx.chat.id);

	let _data = {
		"userID": ctx.from.id,
		"chatID": ctx.chat.id,
		"messageID": cb.message.message_id,
	};
	//TODO: check if need inline_message_id support (unlikely)

	let gameURL = getGameURL(urlName, _data);

	console.log(gameURL);

	if(gameURL){
		return ctx.answerGameQuery(gameURL);
	}
	else{ //error or not found
		return ctx.answerCbQuery("Game "+cb.game_short_name+" not found");
	}
});

//Inline Queries
const validGames = [ "SoaringSheep" ];
const inlineGameButtons = validGames.map((nm) => Markup.callbackButton(
	nm.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'),
	nm
));

bot.on('inline_query', (ctx)=>{
	//log(JSON.stringify(ctx.inlineQuery,null,2), "QUERY");

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
let getGameURL = (nm, data) => {
	let found = validGames.find(el => el === nm);

	if(!found) return false;

	switch (nm) {
		//Only consider the special cases
		//case: ?? return ??
		default:
			return `${process.env.NOW_URL}/${nm}/?userID=${data.userID}&chatID=${data.chatID}&messageID=${data.messageID}`;
	}
}

//================SERVER QUERIES FOR SETTLING HIGHSCORES=================//
router.use(serveStatic('static'));

const scoreRoute = router.route('/score');
scoreRoute.all(bodyParser.json());

scoreRoute.post((req, res, next) => {
	console.log("Got something!");

	let gameName = req.body.game;
	let gameScore = parseInt(req.body.score);

	console.log(gameName+" "+gameScore);

	if(!validGames.find(el => el === gameName)){
		console.log(gameName+" Game not found");
		return next();
	}

	if (req.body.chatID) {
		//TODO: Might have to change
		bot.telegram.setGameScore(req.body.userID, gameScore, req.body.chatID, req.body.messageID)
			.then((score) =>{
			    console.log('Leaderboard: '+JSON.stringify(score));
				res.statusCode = 200;
				res.end();
			}).catch((err) =>{
			    console.log('[ERROR] '+err);
				res.statusCode = err.code || 500;
				res.end(err.description);
			})
	}
});
//================EXPORT BOT=================//
//module.exports = bot;
module.exports = {
	botHandler: bot,
	requestHandler: (req, res) => router(req, res, finalhandler(req, res))
}

//server.listen(port);

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

/*CONVERSION OF EXCEL QUESTIONS TO JSON:

//Array Creation of JSON formatted q&a
a = [ (_input_) ]

arr = []; keys = ["question","answer","categories","reference"]; for(i in a){
	obj = {};
	b = a[i].split("\t");
	for(j=0;j<keys.length;j++){
		if(j!=2) obj[keys[j]] = b[j].toString();
		else obj[keys[j]] = b[j].toLowerCase().split(", ").join(",").split(" ").join("_").split("/").join("_").split(",");
	} arr.push(obj);
	//console.log(JSON.stringify(obj,null,2));
}

console.log(JSON.stringify(arr,null,2));

//Formatting for easier copying
x = JSON.stringify(arr);
for(i in keys){
	k = keys[i].toString();
	r = new RegExp('"'+k+'":',"gi");
	x = x.replace(r,'\n\t"'+k+'":')
}
x = x.split("[{").join("{").split("}]").join("\n}");
x.split("},{").join("\n},\n{");

*/

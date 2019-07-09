/*
CREATING BIBLE QUIZZLE TELEGRAM BOT USING telegraf LIBRARY.

REFERENCES:
- https://thedevs.network/blog/build-a-simple-telegram-bot-with-node-js
- https://www.sohamkamani.com/blog/2016/09/21/making-a-telegram-bot/
*/

/* RUNNING IN NODE JS:
1) now -e BOT_TOKEN='633536414:AAENJwkQwYN3TGOe3LmFw2VyJFr8p7dU9II' --public
2) npm start
(Note that (2) will run (1) as defined in the start script)
*/

//================LIBRARIES AND VARIABLES=================//

//Initialising of Libraries
const { Markup, Extra } = require('micro-bot');
const Telegraf  = require('micro-bot');

const bot = new Telegraf(process.env.BOT_TOKEN, { username: "SamStudiosBot" });
bot.use(Telegraf.log());

//Callback Queries
bot.on('callback_query', (ctx)=>{
	let cb = ctx.callbackQuery;

	if(typeof cb.game_short_name == "undefined"){
		return ctx.replyWithGame(cb.data);
	}

	let urlName = cb.game_short_name;

	let gameURL = getGameURL(urlName);
	console.log("Returned game url", gameURL);

	//WEIRD BUG: ignore whatever is said about using `answerCbQuery` instead; it doesn't work
	return ctx.answerGameQuery(gameURL);
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
			return item.toLowerCase().indexOf(qry)!=-1
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
let getGameURL = (nm)=>{
	console.log("Game URL", nm);

	switch (nm) {
		//Only consider the special cases
		default:
			return "https://samleo8.github.io/"+nm;
	}
}

//================EXPORT BOT=================//
module.exports = bot;

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

/**
 * http://usejsdoc.org/
 */
/* jshint esversion: 6 */
/*
 * Version 1.0.2
 */
var config = require('./config');
const Telebot = require('telebot');
const version = '0.9';
let botname = config.botname;
let standardtime = 86400000;
const bot = new Telebot({
	token: config.bottoken,
	usePlugins: ['commandButton'],
	limit: 1000
});
const mysql = require('mysql');
var dbread = mysql.createPool({
	connectionLimit: 100,
	host: config.dbreaduserhost,
	user: config.dbreaduser,
	password: config.dbreaduserpwd,
	database: 'cleanupbot'
});

var dbwrite = mysql.createPool({
	connectionLimit: 100,
	host: config.dbwriteuserhost,
	user: config.dbwriteuser,
	password: config.dbwriteuserpwd,
	database: 'cleanupbot'
});

bot.start();

console.log("started the groupcleanupbot with version: " + version);

bot.on('newChatMembers', msg => {
	if(msg.new_chat_participant.username == botname)
	{
		msg.reply.text("This bot will kick everyone which has not written enough. The standard time in ms is: " +  standardtime + ". To change this time write /settime $time"); 
		setupgroup(msg.chat.id, standardtime);
	}else{
		setupuser(msg.from.id);
	}
})

bot.on('*', msg => {
	if(msg.chat.type != "private")
	{	
		setupuser(msg.from.id);
		updatetime(msg.date, msg.chat.id, msg.from.id);
	}
});

bot.on(/^\/settimer (.+)$/, (msg, props) => {
	chatadmin(msg.chat.id, msg.from.id);
	if(chatadmin(msg.chat.id, msg.from.id)!="Member"){
		let newtime = props.match[1];
		let sqltimer = "UPDATE Cleanupgroup SET timer = " + newtime + " WHERE Groupid = " + msg.chat.id + ";";
		console.log(sqltimer);
		dbread.getConnection(function(err, connection) {
			if (err) throw err;
			connection.query(sqltimer, function(err, rows) {
				if (err) throw err;
				connection.release();
				msg.reply.text("New Timer set!");
			});
		});
	}
});

bot.on('/users', msg => {
	msg.reply.text("The last message in Group for every person is:");
	let sqlread = "SELECT * FROM GroupUserTime;";
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqlread, function(err, rows) {
			let answer = "";
			for(var i in rows){
				answer = answer + rows[i].Time +" " + rows[i].fk_groupid + " " + rows[i].fk_userid + "\n";
			}
			msg.reply.text(answer);
			if (err) throw err;
			connection.release();
		});
		
	});
})

bot.on('/offtime', msg => {
	msg.reply.text("The offtime per person is:");
	let sqlread = "SELECT `Cleanupgroup`.`Timer` - ( NOW( ) - `GroupUserTime`.`Time` ) AS `Time`, `GroupUserTime`.`fk_groupid` AS `Group`, `GroupUserTime`.`fk_userid` AS `User` FROM { oj `cleanupbot`.`GroupUserTime` AS `GroupUserTime` LEFT OUTER JOIN `cleanupbot`.`Cleanupgroup` AS `Cleanupgroup` ON `GroupUserTime`.`fk_groupid` = `Cleanupgroup`.`Groupid` }";
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqlread, function(err, rows) {
			let answer = "";
			for(var i in rows){
				answer = answer + "" + rows[i].Time +" " + rows[i].Group + " " + rows[i].User + "\n";
			}
			msg.reply.text(answer);
			if (err) throw err;
			connection.release();
		});
		
	});
});


setInterval(function offtimecheckandkick(){
	let sqlread = "SELECT `Cleanupgroup`.`Timer` - ( NOW( ) - `GroupUserTime`.`Time` ) AS `Time`, `GroupUserTime`.`fk_groupid` AS `Group`, `GroupUserTime`.`fk_userid` AS `User` FROM { oj `cleanupbot`.`GroupUserTime` AS `GroupUserTime` LEFT OUTER JOIN `cleanupbot`.`Cleanupgroup` AS `Cleanupgroup` ON `GroupUserTime`.`fk_groupid` = `Cleanupgroup`.`Groupid` }";
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqlread, function(err, rows) {
			let answer = "";
			for(var i in rows){
				if(rows[i].Time < 0){
					bot.sendMessage(rows[i].fk_groupid, "The user with the id " + rows[i].fk_userid + " has been too long offline!");
					kick(rows[i].Group, rows[i].User);
					bot.sendMessage(rows[i].fk_userid, "You have been kicked from the group " + rows[i].fk_groupid + " for not writing for a long time... You can join back if you want! Just keep active ;)");
				}
			}
			if (err) throw err;
			connection.release();
		});
		
	});
},60000);

function kick(groupid, userid){
	let sqlkick = "DELETE FROM GroupUserTime WHERE fk_groupid = '" + groupid +"' AND fk_userid = '" + userid + "';";
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqlkick, function(err, rows) {
			if (err) throw err;
			connection.release();
		});
	});
	bot.unbanChatMember(groupid, userid);
}

function setupgroup(groupid, timer){
	let sqlgroup = "INSERT IGNORE INTO Cleanupgroup (Groupid, timer) VALUES (" + groupid + "," +  timer + ");";
	console.log(sqlgroup);
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqlgroup, function(err, rows) {
			if (err) throw err;
			connection.release();
		});
	});
}

function setupuser(user){
	let sqluser = "INSERT IGNORE INTO User (Userid) VALUES (" + user + ");";
	dbread.getConnection(function(err, connection) {
		if (err) throw err;
		connection.query(sqluser, function(err, rows) {
			if (err) throw err;
			connection.release();
		});
	});
}

function updatetime(date, group, user){
	let updatetime = "REPLACE INTO GroupUserTime (Time, fk_groupid, fk_userid) VALUES (FROM_UNIXTIME(" + date + ")," + group + "," + user + ");";
	
	dbwrite.getConnection(function(err, connection) {
		connection.query(updatetime, function(err, rows) {
			if (err) throw err;
			connection.release();
		});
		
	});
}

function chatadmin(group, user){
	return bot.getChatMember(group,user).then(function(data)
	{
		console.log(data.status)
		if(data.status == "member")
			return false;
		else
			return true;
	});
}
		
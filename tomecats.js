var express = require('express');
var io      = require('socket.io');
var Tome    = require('tomes').Tome;
var build   = require('./build');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
var map = { x: 2000, y: 2000 };

function log(data) {
	console.log('[' + new Date().toISOString() + '] tomecats.' + process.pid + ': ' + data);
}

var game = Tome.conjure({ map: map, cats: {} });
var catMap = {};
var merging;

function handleSocketDisconnect() {
	log(this.id + ' disconnected.');

	var name = catMap[this.id].name;
	delete catMap[this.id];

	if (game.cats.hasOwnProperty(name)) {
		game.cats.del(name);
	}
}

function handleCatDiff(diff) {
	log(this.id + ' sent a diff:' + JSON.stringify(diff));

	if (!catMap[this.id].name) {
		return; // has no cat.
	}

	merging = true;
	game.cats.merge(diff);
	this.broadcast.emit('diff', diff);
	game.cats.read();
	merging = false;
}

function handleCatsReadable() {
	if (merging) {
		return;
	}

	var diff = this.read();

	if (diff) {
		for (var id in catMap) {
			log(id + ' getting '+ JSON.stringify(diff));
			catMap[id].socket.emit('diff', diff);
		}
	}
}

game.cats.on('readable', handleCatsReadable);

function nameIsOk(name) {
	if (game.cats.hasOwnProperty(name)) {
		return false;
	}

	if (name.trim() === '') {
		return false;
	}

	return true;
}

function rnd(n) {
	return Math.round(Math.random() * n);
}

function handleSetName(name) {
	if (catMap[this.id].hasOwnProperty('name')) {
		if (catMap[this.id].name === name) {
			return;
		}

		if (!nameIsOk(name)) {
			return this.emit('badname');
		}

		game.cats.rename(catMap[this.id].name, name);
	} else {
		if (!nameIsOk(name)) {
			return this.emit('badname');
		}

		var rndX = rnd(500) + 50;
		var rndY = rnd(400) + 50;

		var now = new Date().getTime();

		game.cats.set(name, { t: { x: rndX, y: rndY, d: 'l', s: 'c1' }, c: [] });
		game.cats[name].c.on('add', function () {
			var that = this;
			setTimeout(function () {
				that.shift();
			}, 3000);
		});
	}
	
	catMap[this.id].name = name;

	this.emit('nameSet', name);
}

function handleSocketsConnection(socket) {
	log(socket.id + ' connected.');
	
	catMap[socket.id] = { socket: socket };

	socket.emit('game', game);
	socket.on('disconnect', handleSocketDisconnect);
	socket.on('diff', handleCatDiff);
	socket.on('setName', handleSetName);
}

function isNumber (o) {
	if (parseInt(o, 10) == o) {
		return true;
	}
	return false;
}

function handleSigInt() {
	catsServer.close();
}

function handleUncaughtException(err) {
	handleSigInt();
	log(err);
	process.exit();
}

var catsExpress = express();

catsExpress.use(express.favicon());
catsExpress.use(express.logger('dev'));

catsExpress.get('/', build, function (req, res) {
	res.sendfile('./client/index.html');
});

catsExpress.get('/tomecats.js', function (req, res) {
	res.sendfile('./public/tomecats.js');
});

catsExpress.get('/css/:css', function (req, res) {
	var css = req.params.css;
	res.sendfile('./client/css/' + css);
});

catsExpress.get('/images/:image', function (req, res) {
	var image = req.params.image;
	res.sendfile('./client/images/' + image);
});

var catsServer = catsExpress.listen(port, function () {
	if (!isNumber(port)) {
		require('fs').chmod(port, parseInt('777', 8));
		process.on('SIGINT', handleSigInt);
		process.on('uncaughtException', handleUncaughtException);
	}
});

var catsIO = io.listen(catsServer);

catsIO.set('log level', 1);

catsIO.sockets.on('connection', handleSocketsConnection);

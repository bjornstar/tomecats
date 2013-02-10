var express = require('express');
var io      = require('socket.io');
var Tome    = require('tomes').Tome;

var port = process.env.PORT || 3000;

function log(data) {
	console.log('[' + new Date().toISOString() + '] tomecats.' + process.pid + ': ' + data);
}

var cats = Tome.conjure({});
var catMap = {};
var merging;

function handleSocketDisconnect() {
	log('Client ' + this.id + ' disconnected.');

	var name = catMap[this.id].name;
	delete catMap[this.id];

	if (cats.hasOwnProperty(name)) {
		cats.del(name);
	}
}

function handleCatDiff(diff) {
	log('Client ' + this.id + ' sent a diff:' + JSON.stringify(diff));

	merging = true;
	cats.merge(diff);
	this.broadcast.emit('diff', diff);
	cats.read();
	merging = false;
}

function handleCatsReadable() {
	if (merging) {
		return;
	}
	var diff = this.read();
	while (diff) {
		for (var id in catMap) {
			log('Client ' + id + ' getting '+ JSON.stringify(diff));
			catMap[id].socket.emit('diff', diff);
		}
		diff = this.read();
	}
}

cats.on('readable', handleCatsReadable);

function nameIsOk(name) {
	if (cats.hasOwnProperty(name)) {
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

		cats.rename(catMap[this.id].name, name);
	} else {
		if (!nameIsOk(name)) {
			return this.emit('badname');
		}

		cats.set(name, { x: rnd(500) + 10, y: rnd(400) + 50 });
	}
	
	catMap[this.id].name = name;

	this.emit('nameSet', name);
}

function handleSocketsConnection(socket) {
	log('Client ' + socket.id + ' connected.');
	
	catMap[socket.id] = { socket: socket };

	socket.emit('cats', cats);
	socket.on('disconnect', handleSocketDisconnect);
	socket.on('diff', handleCatDiff);
	socket.on('setName', handleSetName);
}

var catsExpress = express();

catsExpress.get('/', function (req, res) {
	res.sendfile('./www/index.html');
});

catsExpress.get('/tomes.js', function (req, res) {
	res.sendfile('./node_modules/tomes/tomes.js');
});

catsExpress.get('/eventEmitter.js', function (req, res) {
	res.sendfile('./node_modules/eventemitter2/lib/eventemitter2.js');
});

catsExpress.get('/favicon.ico', function (req, res) {
	res.send(404);
});

catsExpress.get('/js/:js', function (req, res) {
	var js = req.params.js;
	res.sendfile('./www/js/' + js);
});

catsExpress.get('/css/:css', function (req, res) {
	var css = req.params.css;
	res.sendfile('./www/css/' + css);
});

catsExpress.get('/images/:image', function (req, res) {
	var image = req.params.image;
	res.sendfile('./www/images/' + image);
});


var catsServer = catsExpress.listen(port);

var catsIO = io.listen(catsServer);

catsIO.set('log level', 1);

catsIO.sockets.on('connection', handleSocketsConnection);

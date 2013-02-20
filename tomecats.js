// Copyright (C) 2013 Wizcorp, Inc. <info@wizcorp.jp>
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

//  _____                       ___      _
// /__   \___  _ __ ___   ___  / __\__ _| |_ ___
//   / /\/ _ \| '_ ` _ \ / _ \/ /  / _` | __/ __|
//  / / | (_) | | | | | |  __/ /__| (_| | |_\__ \
//  \/   \___/|_| |_| |_|\___\____/\__,_|\__|___/
//

var express = require('express');
var io      = require('socket.io');
var Tome    = require('tomes').Tome;
var build   = require('./build');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
var chatDuration = 3000;

var cats = Tome.conjure({});
var catMap = {};
var merging;

function log(data) {
	console.log('[' + new Date().toISOString() + '] tomecats.' + process.pid + ': ' + data);
}

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
	return Math.floor(Math.random() * n);
}

function handleSocketDisconnect() {
	log(this.id + ' disconnected.');

	var name = catMap[this.id].name;
	delete catMap[this.id];

	if (cats.hasOwnProperty(name)) {
		cats.del(name);
	}
}

function handleCatDiff(diff) {
	log(this.id + ' sent a diff:' + JSON.stringify(diff));

	if (!catMap[this.id].name) {
		return; // has no cat.
	}

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

	if (diff) {
		for (var id in catMap) {
			log(id + ' getting '+ JSON.stringify(diff));
			catMap[id].socket.emit('diff', diff);
		}
	}
}

cats.on('readable', handleCatsReadable);

function setChatExpire() {
	var that = this;
	setTimeout(function () {
		that.shift();
	}, chatDuration);
}

function handleLogin(name, catType, propType, x, y, d) {
	if (!nameIsOk(name)) {
		return this.emit('badname');
	}

	if (catMap[this.id].hasOwnProperty('name')) {
		return cats.rename(catMap[this.id].name, name);
	}

	var rndX = rnd(500) + 50;
	var rndY = rnd(400) + 50;
	var rndCat = rnd(10) + 1;
	var rndProp = rnd(7) + 1;

	var newCat = {
		catType: catType || 'c' + rndCat,
		propType: propType || 'a' + rndProp,
		pos: {
			x: x || rndX,
			y: y || rndY,
			d: d || 'r'
		},
		chat: []
	};

	cats.set(name, newCat);
	cats[name].chat.on('add', setChatExpire);
	
	catMap[this.id].name = name;

	this.emit('loggedIn', name);
}

function handleSocketsConnection(socket) {
	log(socket.id + ' connected.');
	
	catMap[socket.id] = { socket: socket };

	socket.emit('game', cats);
	socket.on('disconnect', handleSocketDisconnect);
	socket.on('diff', handleCatDiff);
	socket.on('login', handleLogin);
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

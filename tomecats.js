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

var appName = require('./package.json').name;
var appConfig = require('./config');

try {
	process.env.NEW_RELIC_APP_NAME = appName;
	process.env.NEW_RELIC_LICENSE_KEY = appConfig.newrelic;
	process.env.NEW_RELIC_NO_CONFIG_FILE = true;
	require('newrelic');
	console.log('using newrelic.');
} catch (e) {
	console.log(e);
	console.warn('Could not start newrelic.');
}

try {
	var nodeflyProfile = appConfig.nodefly;
	var nodeflyAppDetails = [ appName ]; 
	var appfog = process.env.VMC_APP_INSTANCE ? JSON.parse(process.env.VMC_APP_INSTANCE) : undefined;

	if (appfog) {
		nodeflyAppDetails.push(appfog.name, appfog.instance_index);
	}

	require('nodefly').profile(nodeflyProfile, nodeflyAppDetails);
	console.log('using nodefly.');
} catch (e) {
	console.log(e);
	console.warn('Could not start nodefly.');
}

var express   = require('express');
var io        = require('socket.io');
var Tome      = require('tomes').Tome;
var build     = require('./build');
var analytics = require('./analytics');

// Heroku uses PORT
// AppFog uses VCAP_APP_PORT

var port = process.env.PORT || process.env.VCAP_APP_PORT || 3000;
var chatDuration = 3000;

var cats = Tome.conjure({});
var catMap = {};
var merging;

function log(data) {
	// A pretty logging function.
	console.log('[' + new Date().toISOString() + '] tomecats.' + process.pid + ' - ' + data);
}

function nameIsOk(name) {
	// Is there already a cat with that name?
	if (cats.hasOwnProperty(name)) {
		return false;
	}

	// Is the name empty?
	if (name.trim() === '') {
		return false;
	}

	return true;
}

function rnd(n) {
	// A handy random function.
	return Math.floor(Math.random() * n);
}

function handleSocketDisconnect() {
	// When we get a disconnect we need to do a few things.
	log(this.id + ' disconnected.');

	// Remove the cat from the cat map.
	var name = catMap[this.id].name;
	delete catMap[this.id];

	// And remove the cat from cats. Thanks to the magic of tomes, this gets
	// synchronized to all clients.
	if (cats.hasOwnProperty(name)) {
		cats.del(name);
	}

	analytics.track({ userId: this.id, event: 'disconnected' });
}

function mergeDiff(diff) {
	log(this.id + ': ' + JSON.stringify(diff));

	// If we got a diff from a strange socket, just ingore it.
	if (!catMap[this.id].name) {
		return; // has no cat.
	}

	// Set merging to true so we know that any readable emission is from a
	// merge.
	merging = true;

	// Merge the diff
	cats.merge(diff);

	// Here is the perfect storm: tomes + socket.io

	// We can simply broadcast the diff which sends it to all clients except
	// for the one that sent it.
	this.broadcast.emit('diff', diff);

	// Throw away the diff since we don't want to do anything with it.
	cats.read();

	// And now we are done with merging.
	merging = false;
}

function sendDiffToAll() {
	// If we are merging we will use broadcast to send the diff to all clients
	// except for the one who sent it.

	if (merging) {
		return;
	}

	var diff = this.read();

	if (diff) {
		log('broadcast: '+ JSON.stringify(diff));

		// More of the match made in heaven: sockets.emit sends the diff to all
		// connected clients.
		catsIO.sockets.emit('diff', diff);
	}
}

// When cats change, send the diff to all clients.
cats.on('readable', sendDiffToAll);

// We want our chat message to expire after a certain amount of time so that we
// don't have them clogging up our tubes.
function setChatExpire() {
	var that = this;
	
	var chatExpire = setTimeout(function () {
		// Shift the chat message off the front of the array, the magic of
		// of tomes updates all our clients.
		that.shift();
	}, chatDuration);

	// It's possible that our cat disconnects before the chat expires. In that
	// case, clear the timeout so we are not modifying destroyed tomes.

	this.on('destroy', function () {
		clearTimeout(chatExpire);
	});
}

function handleLogin(name, catType, propType, pos) {
	// If the client has a bad name, tell them.
	if (!nameIsOk(name)) {
		return this.emit('badname');
	}

	// If the client is just changing their name, perform a rename. No need to
	// set anything else up. Tomes allows us to change keys without losing
	// references.
	if (catMap[this.id].hasOwnProperty('name')) {
		cats.rename(catMap[this.id].name, name);
		return this.emit('loggedIn', name);
	}

	// Let's set some random values as defaults
	var rndX = rnd(500) + 50;
	var rndY = rnd(400) + 50;
	var rndCat = rnd(10) + 1;
	var rndProp = rnd(7) + 1;

	// This is where your kitty is born.
	var newCat = {
		catType: catType || 'c' + rndCat,
		propType: propType || 'a' + rndProp,
		pos: {
			x: pos ? pos.x : rndX,
			y: pos ? pos.y : rndY,
			d: pos ? pos.d : 'r'
		},
		chat: []
	};

	// Add the cat to our cats tome and all clients will automagically get
	// updated. 
	cats.set(name, newCat);

	// When we receive a chat message, queue it up for deletion after a period
	// of time.
	cats[name].chat.on('add', setChatExpire);
	
	// Add the cat to the map with the socket.id as the key so we know which
	// socket belongs to which cat.
	catMap[this.id].name = name;

	// And tell the client who is logging in what their cat's name is.
	this.emit('loggedIn', name);

	analytics.identify({ userId: this.id, traits: { name: name } });
}

function clientConnect(socket) {
	log(socket.id + ' connected.');
	
	// Register this socket in our catMap. We will set the name of their cat
	// to indicate they are logged in.
	catMap[socket.id] = { socket: socket };

	// When a client connects, we send them a copy of the cats tome. Once they
	// have that, all updates are automatic.
	socket.emit('game', cats);

	// On disconnect, erase the client's cat.
	socket.on('disconnect', handleSocketDisconnect);

	// On diff, the client sent us a change to their cat.
	socket.on('diff', mergeDiff);

	// On login, the client is trying to login.
	socket.on('login', handleLogin);

	analytics.track({ userId: socket.id, event: 'connected' });
}

function isNumber (o) {
	// For checking if the port is a number or a file.
	if (parseInt(o, 10) == o) {
		return true;
	}
	return false;
}

function closeServer() {
	// Catch ctrl+c and close the socket to clean up. This is only for sockets.
	catsServer.close();
}

function handleUncaughtException(err) {
	// We don't want to leave the socket file laying around. Only for sockets.
	closeServer();
	log(err);
	process.exit();
}

var catsExpress = express();

// Some handy express builtins.
catsExpress.use(express.favicon());
catsExpress.use(express.logger('dev'));

// See that build in there? When the client requests the index page, we build
// the client scripts, then serve the html.
catsExpress.get('/', build, function (req, res) {
	res.sendfile('./client/index.html');
});

// The built client javascript files end up here.
catsExpress.get('/tomecats.js', function (req, res) {
	res.sendfile('./public/tomecats.js');
});

// CSS files served from /client/css
catsExpress.get('/css/:css', function (req, res) {
	var css = req.params.css;
	res.sendfile('./client/css/' + css);
});

// Images served from /client/images
catsExpress.get('/images/:image', function (req, res) {
	var image = req.params.image;
	res.sendfile('./client/images/' + image);
});

catsExpress.get('/audio/:audio', function (req, res) {
	var audio = req.params.audio;
	res.sendfile('./client/audio/' + audio);
});

// This starts our express web server listening on either a port or a socket.
var catsServer = catsExpress.listen(port, function () {
	if (!isNumber(port)) {
		// If it's a socket, we want to chmod it so nginx can see it and we
		// also want to clean up the file when we exit.
		require('fs').chmod(port, parseInt('777', 8));
		process.on('SIGINT', closeServer);
		process.on('uncaughtException', handleUncaughtException);
	}
});

// Stick socket.io on express and we're off to the races.
var catsIO = io.listen(catsServer);

catsIO.set('log level', 1);
catsIO.sockets.on('connection', clientConnect);

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

// We can require Tomes thanks to component.
var Tome = require('tomes').Tome;

// We include socket.io on the page.
var socket;

// These are our global variables for the game.
var cats, me, merging, catSelect, view;

// This is our click handler.
function handleNewCoords(newX, newY) {
	// Do you have a cat yet?
	if (!me) {
		return;
	}

	// Are you moving left or right?
	var newD = 'r';

	if (newX < me.pos.x) {
		newD = 'l';
	}

	// We update our position and it gets automatically distributed to all the
	// other users thanks to the magic of tomes.

	me.pos.assign({ x: newX, y: newY, d: newD });
}

function handleMeDestroy() {
	// If we got destroyed it's because the server restarted, let's log in with
	// our current information.

	login(me.getKey(), me.catType, me.propType, me.pos);
}

function handleMeReadable() {
	// This is the magic of tomes. Whenever we make changes to our cat, we send
	// that to the server.

	// We set merging to true when we receive data from the server. Since we
	// are getting changes from the server, we don't need to send that back.

	if (merging) {
		return;
	}

	// Get the changes
	var diff = me.read();

	if (diff) {
		// Send them to the server.
		socket.emit('diff', diff);
	}
}

function handleChatInput(e) {
	// When you press enter (keycode 13) and there is text in the chat box.
	var chatText = this.value;
	if (e.keyCode === 13 && chatText.length) {
		// Push the text onto our chat object. Remember, any changes we make
		// automatically get sent to the server so we don't have to do anything
		// else.
		me.chat.push(chatText);
		
		// clear the chat box.
		this.value = '';
		
		return false;
	}
	return true;
}

function setupChatHooks() {
	// Setup a listener for the chat box.
	var chatinput = document.getElementById('chat');
	chatinput.addEventListener('keypress', handleChatInput);

	window.addEventListener('keypress', function () {
		chatinput.focus();
	});

	// Set keyboard focus to the chat box.
	chatinput.focus();
}

function handleLoggedIn(name) {
	// You just logged in. Assign your cat to the me variable.
	me = cats[name];

	// Set up a listener for changes to our cat.
	me.on('readable', handleMeReadable);
	me.on('destroy', handleMeDestroy);

	catSelect.hide();

	// Setup the chat box event handlers.
	setupChatHooks();

	view.setRef(me);
}

function addCat(name) {
	// A cat was added to the game.

	var cat = cats[name];

	// Add the cat to the view, the views are responsible for hooking up
	// events.
	view.addCat(cat);
}

function handleGameData(data) {
	// When we connect to the server, the server sends us a copy of the game
	// data.

	// If we already have game data we need to destroy our copy of the data.
	// Everything gets cleaned up automatically.

	if (cats) {
		Tome.destroy(cats);
	}

	// Conjure a new Tome to hold our game data.
	cats = Tome.conjure(data);

	// Go through the list of cats in the game and add them to our playground.
	for (var name in cats) {
		if (cats.hasOwnProperty(name)) {
			addCat(name);
		}
	}

	// And add a listener for more cats to join the party.
	cats.on('add', addCat);
}

function handleDiff(diff) {
	// The server sends us updates to the game. We set merging to true so that
	// we know that all events triggered are from the server.

	merging = true;

	// We merge the diff into our game data.
	cats.merge(diff);

	// And throw away the diffs generated when we merged the data.
	cats.read();

	// And now we're done updating so we set merging to false.
	merging = false;
}

function login(name, catType, propType, pos) {
	// Send our login information to the server.
	socket.emit('login', name, catType, propType, pos);
}

function contentLoaded() {
	// The page has loaded completely, we can start our game.
	catSelect = require('./catselect').CatSelect();
	
	catSelect.on('login', login);
	
	// Look at our URL and see if we want CSS or Canvas
	if (window.location.href.match(/#canvas/i)) {
		var CanvasView = require('./canvasView').CanvasView;
		view = new CanvasView();
	} else {
		var CssView = require('./cssView').CssView;
		view = new CssView();
	}

	view.on('newCoords', handleNewCoords);

	window.scrollTo(0,1);

	if (config && config.hasOwnProperty('google-analytics')) {
		require('ga')(config['google-analytics']);
	}

	socket = io.connect();

	// The server emits game with gamedata when we connect. We always sync our game
	// to this data.
	socket.on('game', handleGameData);

	// The server emits diff with a diff whenever there are changes
	socket.on('diff', handleDiff);

	// The server emits loggedin with our name when we have succesfully logged in.
	socket.on('loggedIn', handleLoggedIn);

	// If our name is taken the server emits badname.
	socket.on('badname', catSelect.showBadName);
}

// Listen for the page to indicate that it's ready.
document.addEventListener("DOMContentLoaded", contentLoaded);

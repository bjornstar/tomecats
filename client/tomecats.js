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
var socket = io.connect();

// These are our global variables for the game.
var cats, me, merging;

// This is our click handler.
function handlePlaygroundMouseUp(event) {
	// Do you have a cat yet?
	if (!me) {
		return;
	}

	// Get mouse coords
	var newX = event.pageX;

	// Don't go over the chat box.
	var newY = Math.min(event.pageY, this.clientHeight - 75);

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

	login(me.getKey(), me.catType, me.propType, me.pos.x, me.pos.y, me.pos.d);
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

function handleBadName() {
	// Set the loginError text
	var loginError = document.getElementById('loginError');
	loginError.textContent = 'Invalid name, please try a different one.';

	// Show the welcome screen
	var welcome = document.getElementById('Welcome');
	welcome.style.display = '';

	// Show the blocker
	var blocker = document.getElementById('blocker');
	blocker.style.display = '';
}

function handleChatInput(e) {
	// When you press enter (keycode 13) and there is text in the chat box.
	if (e.keyCode === 13 && e.target.value.length) {
		
		// Push the text onto our chat object. Remember, any changes we make
		// automatically get sent to the server so we don't have to do anything
		// else.
		me.chat.push(e.target.value);
		
		// clear the chat box.
		e.target.value = '';
		
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	return true;
}

function setupChatHooks() {
	// Setup a listener for the chat box.
	var chatinput = document.getElementById('chat');
	chatinput.addEventListener('keypress', handleChatInput);

	// Set keyboard focus to the chat box.
	chatinput.focus();
}

function handleLoggedIn(name) {
	// You just logged in. Assign your cat to the me variable.
	me = cats[name];

	// Set up a listener for changes to our cat.
	me.on('readable', handleMeReadable);
	me.on('destroy', handleMeDestroy);

	// Hide the welcome screen.
	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	// Hide the blocker.
	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';

	// Setup the chat box event handlers.
	setupChatHooks();
}

function addCat(name) {
	// A cat was added to the game.

	var cat = cats[name];

	// Create a container for the cat (a catainer), this holds the cat, props,
	// nametag, and chat bubbles. We do this so we can just move the catainer
	// and everything will move together.

	var cnt = document.createElement('div');
	cnt.className = 'catainer';
	cnt.style.transform = 'translate(' + cat.pos.x + 'px, ' + cat.pos.y + 'px)';
	cnt.style.webkitTransform = 'translate(' + cat.pos.x + 'px, ' + cat.pos.y + 'px)';

	// Create the cat.

	var div = document.createElement('div');
	div.className = 'cat';
	div.style.backgroundImage = 'url(/images/' + cat.catType + '.png)';
	div.style.transform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';
	div.style.webkitTransform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';

	// Now create the cat props.

	var prop = document.createElement('div');
	prop.className = 'prop';
	prop.style.backgroundImage = 'url(/images/' + cat.propType + '.png)';
	prop.style.transform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';
	prop.style.webkitTransform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';

	// And create the nametag.

	var nametag = document.createElement('div');
	nametag.className = 'nametag';
	nametag.textContent = name;

	// And the chat bubbles.

	var chatList = document.createElement('div');
	chatList.className = 'chatList';

	// Stick them all into the 'catainer'

	cnt.appendChild(chatList);
	cnt.appendChild(div);
	cnt.appendChild(prop);
	cnt.appendChild(nametag);

	// Finally, put the catainer onto the playground with the other cats.

	var playground = document.getElementById('playground');
	playground.appendChild(cnt);


	// We want the cat to fade in. The default opacity of a catainer is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);

	// Now comes the fun part: wiring up the cat's changes.

	// First we want to create transforms for when our cat's position changes.

	cat.pos.on('readable', function () {
		var movement = 'translate(' + this.x + 'px, ' + this.y + 'px)';
		var direction = 'scaleX(' + (this.d == 'l' ? -1 : 1) + ')';

		// We apply movement transforms to the whole catainer so that
		// everything moves together.

		cnt.style.transform = movement;
		cnt.style.webkitTransform = movement;

		// We want to be able to flip the cat left and right, but not the text
		// so we only apply the direction changes to the cat.

		div.style.transform = direction;
		div.style.webkitTransform = direction;

		// And of course we want the cat's props to stay on the cat so we flip
		// them too.

		prop.style.transform = direction;
		prop.style.webkitTransform = direction;
	});

	// When a user logs out, the server deletes the cat. We want to fade out
	// the cat so we listen for the destroy event.

	cat.on('destroy', function() {
		// We fade out the cat by setting the opacity to 0.
		cnt.style.opacity = 0;

		// and when the opacity reaches 0 we remove the cat from the playground.
		cnt.addEventListener('transitionEnd', function () {
			playground.removeChild(cnt);
		});

		cnt.addEventListener('webkitTransitionEnd', function () {
			playground.removeChild(cnt);
		});
	});

	cat.chat.on('add', function (index) {
		// When some text gets added to a cat's chat we want to display it.

		var chatText = this[index];

		// Create a new chat bubble.
		var newChat = document.createElement('div');
		newChat.textContent = chatText;

		// Stick it on the chatList.
		chatList.appendChild(newChat);

		// We want the chat bubbles to fade in just like our cat.
		setTimeout(function () {
			newChat.style.opacity = 1;
		}, 0);

		// The server takes care of cleaning up chat messages after a certain
		// period of time. All we need to do is listen for it to be destroyed
		// and remove the chat bubble.

		chatText.on('destroy', function () {
			// Make the chat bubble fade out by setting the opacity to 0.
			newChat.style.opacity = 0;

			// And when the fade out is done, we remove the chat bubble.
			newChat.addEventListener('transitionEnd', function () {
				chatList.removeChild(newChat);
			});

			newChat.addEventListener('webkitTransitionEnd', function () {
				chatList.removeChild(newChat);
			});
		});
	});
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

// The server emits game with gamedata when we connect. We always sync our game
// to this data.
socket.on('game', handleGameData);

// The server emits diff with a diff whenever there are changes
socket.on('diff', handleDiff);

// If our name is taken the server emits badname.
socket.on('badname', handleBadName);

// The server emits loggedin with our name when we have succesfully logged in.
socket.on('loggedIn', handleLoggedIn);

function login(name, catType, propType, x, y, d) {
	// Clear the error text.
	var loginError = document.getElementById('loginError');
	loginError.textContent = '';

	// Send our login information to the server.
	socket.emit('login', name, catType, propType, x, y, d);
}

function contentLoaded() {
	// The page has loaded completely, we can start our game.

	var ulCatTypes = document.getElementById('catTypes');
	ulCatTypes.addEventListener('mouseup', function (e) {
		console.log(e.target);
	});

	// Get the input box for our cat's name.
	var name = document.getElementById('name');
	
	// Set keyboard focus on it so we can start typing immediately.
	name.focus();

	// Listen for return.
	name.addEventListener('keydown', function (e) {
		// If it's return and we have some text, login with that name.

		if (e.keyCode === 13 && e.target.value.length) {
			login(e.target.value);
		}
	});

	var loginButton = document.getElementById('login');

	loginButton.addEventListener('click', function (e) {
		// If we don't have any text, do nothing.
		if (!name.value.length) {
			return;
		}

		// Login with that name.
		login(name.value);

		e.preventDefault();
		e.stopPropagation();
	}, false);

	// Listen for clicks on the playground.
	var playground = document.getElementById('playground');
	playground.addEventListener('mouseup', handlePlaygroundMouseUp);
}

// Listen for the page to indicate that it's ready.
document.addEventListener("DOMContentLoaded", contentLoaded);

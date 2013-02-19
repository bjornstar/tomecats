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

var Tome = require('tomes').Tome;

var socket = io.connect();
var playground;
var sCats, sMe, merging, gameData;

function handlePlaygroundMouseUp(event) {
	// Do you have a cat yet?
	if (!sMe) {
		return;
	}

	// Get mouse coords
	var newX = event.pageX;
	var newY = event.pageY;

	var newD = 'l';

	// Are you moving left or right?
	if (newX > sMe.t.x) {
		newD = 'r';
	}

	sMe.t.assign({ x: newX, y: newY, d: newD });
}

function handleSMeDestroy() {
	sMe = undefined;
}

function handleSMeReadable() {
	if (merging) {
		return;
	}

	var diff = sMe.read();

	if (diff) {
		socket.emit('diff', diff);
	}
}

function handleDiff(diff) {
	merging = true;
	sCats.merge(diff);
	sCats.read();
	merging = false;
}

function handleChatInput(e) {
	if (e.keyCode === 13) {
		sMe.c.push(e.target.value);
		e.target.value = '';
		e.preventDefault();
		e.stopPropagation();
		return false;
	}
	return true;
}

function setupChatHooks() {
	var chatinput = document.getElementById('chat');
	chatinput.addEventListener('keypress', handleChatInput);

	chatinput.focus();
}

function handleBadName() {
	console.log('bad name.');
	var badname = document.getElementById('badname');
	badname.textContent = 'Invalid name, please try a different one.';
	var welcome = document.getElementById('Welcome');
	var blocker = document.getElementById('blocker');
	welcome.style.display = '';
	blocker.style.display = '';
}

function handleNameSet(name) {
	sMe = sCats[name];

	sMe.on('readable', handleSMeReadable);
	sMe.on('destroy', handleSMeDestroy);

	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';

	setupChatHooks();
}

function handleAddCat(name) {
	console.log('cat added:', name);

	var cat = sCats[name];

	var cnt = document.createElement('div');
	cnt.className = 'catainer';
	cnt.style.transform = 'translate(' + cat.t.x + 'px, ' + cat.t.y + 'px)';
	cnt.style.webkitTransform = 'translate(' + cat.t.x + 'px, ' + cat.t.y + 'px)';

	// create the cat

	var div = document.createElement('div');
	div.className = 'cat';
	div.style.backgroundImage = 'url(/images/c' + Math.floor(Math.random() * 10 + 1) + '.png)';
	div.style.transform = 'scaleX(' + (this.d == 'l' ? -1 : 1) + ')';
	div.style.webkitTransform = 'scaleX(' + (this.d == 'l' ? -1 : 1) + ')';
	div.id = name;

	var prop = document.createElement('div');
	prop.className = 'prop';
	prop.style.backgroundImage = 'url(/images/a' + Math.floor(Math.random() * 7 + 1) + '.png)';


	var nametag = document.createElement('div');
	nametag.className = 'nametag';
	nametag.textContent = name;

	var chatList = document.createElement('div');
	chatList.className = 'chatList';

	// add 

	cnt.appendChild(chatList);
	cnt.appendChild(div);
	cnt.appendChild(prop);
	cnt.appendChild(nametag);
	playground.appendChild(cnt);

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);

	cat.t.on('readable', function () {
		cnt.style.transform = 'translate(' + this.x + 'px, ' + this.y + 'px)';
		cnt.style.webkitTransform = 'translate(' + this.x + 'px, ' + this.y + 'px)';
		div.style.transform = 'scaleX(' + (this.d == 'l' ? -1 : 1) + ')';
		div.style.webkitTransform = 'scaleX(' + (this.d == 'l' ? -1 : 1) + ')';
	});

	cat.c.on('add', function (index) {
		var newChat = document.createElement('div');
		newChat.textContent = this[index];
		chatList.appendChild(newChat);
		setTimeout(function () {
			newChat.style.opacity = 1;
		}, 0);
	});

	cat.c.on('del', function () {
		var toDel = chatList.querySelector(':not(.deleted)');

		toDel.className = 'deleted';

		toDel.style.opacity = 0;
		toDel.addEventListener('transitionEnd', function () {
			chatList.removeChild(toDel);
		});
		toDel.addEventListener('webkitTransitionEnd', function () {
			chatList.removeChild(toDel);
		});
	});

	cat.on('destroy', function() {
		cnt.style.opacity = 0;
		cnt.addEventListener('transitionEnd', function () {
			playground.removeChild(cnt);
		});
		cnt.addEventListener('webkitTransitionEnd', function () {
			playground.removeChild(cnt);
		});
	});
}

function handleGameData(data) {
	console.log('Game data:', JSON.stringify(data));

	gameData = Tome.conjure(data);
	sCats = gameData.cats;
	window.cats = sCats;
	var names = Object.keys(sCats);

	for (var i = 0, len = names.length; i < len; i += 1) {
		var name = names[i];
		handleAddCat(name);
	}

	sCats.on('add', handleAddCat);
}

socket.on('game', handleGameData);
socket.on('diff', handleDiff);

socket.on('badname', handleBadName);
socket.on('nameSet', handleNameSet);

socket.on('connect', function () {
	console.log('connected.');
});

function setName(name) {
	var badname = document.getElementById('badname');
	badname.textContent = '';

	socket.emit('setName', name);
}

function contentLoaded() {
	var ulCatTypes = document.getElementById('catTypes');
	ulCatTypes.addEventListener('mouseup', function (e) {
		console.log(e.target);
	});

	var name = document.getElementById('name');
	name.focus();

	name.addEventListener('keydown', function (e) {
		if (e.keyCode === 13) {
			setName(e.target.value);
		}
	});

	var setNameButton = document.getElementById('setName');

	setNameButton.addEventListener('click', function (e) {
		var name = document.getElementById('name');
		setName(name.value);

		e.preventDefault();
		e.stopPropagation();
	}, false);

	playground = document.getElementById('playground');
	playground.addEventListener('mouseup', handlePlaygroundMouseUp);
}

document.addEventListener("DOMContentLoaded", contentLoaded);

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

var raf = require('raf');
var Tome = require('tomes').Tome;
var Tween = require('tween');

var socket = io.connect();

var map = { width: 2000, height: 500 };
var halfCanvasW = 0;
var halfCanvasH = 0;
var debug = true;

var sCats, sMe, cMe, canvas, context, sprite, prop, lastCats, dragging, merging, gameData;
var cCats = Tome.conjure({});
var tweens = {};
var chatTweens = {};
var offset = { x: 0, y: 0 };
var mouse = { x: 0, y: 0 };

function handleWindowMouseUp(event) {
	// Did you click on the canvas?
	if (event.target.tagName !== 'CANVAS') {
		return;
	}

	// Do you have a cat yet?
	if (!sMe) {
		return;
	}

	// Get mouse coords
	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	// Calculate real map coords
	var dX = eX + offset.x;
	var dY = eY + offset.y;

	// Add some padding and do not exceed map coordinates
	var newX = Math.max(Math.min(dX, map.width - sprite.width / 2), sprite.width / 2);
	var newY = Math.max(Math.min(dY, map.height - sprite.height / 2 - 18), sprite.width / 2);

	// Are you moving left or right?
	if (newX > sMe.t.x) {
		newD = 'r';
	} else if (newX < sMe.t.x) {
		newD = 'l';
	}

	sMe.t.assign({ x: newX, y: newY, d: newD });
}

function updateOffset() {
	var meX = cMe ? cMe.t.x : 0;
	var meY = cMe ? cMe.t.y : 0;

	offset.x = Math.min(Math.max(meX - halfCanvasW, 0), Math.max(map.width - canvas.width, 0));
	offset.y = Math.min(Math.max(meY - halfCanvasH, 0), Math.max(map.height - canvas.height, 0));
}

function calcMouseOffset() {
	var x = Math.max(Math.min(offset.x + mouse.x - halfCanvasW, map.width - canvas.width), 0);
	var y = Math.max(Math.min(offset.y + mouse.y - halfCanvasH, map.height - canvas.height), 0);

	return { x: x, y: y };
}

function drawDebugText() {
	context.font = '8pt sans-serif';
	context.textAlign = 'right';
	context.fillText('mouse: ' + mouse.x + ', ' + mouse.y, canvas.width - 6, 18);
	context.fillText('map: ' + (mouse.x + offset.x) + ', ' + (mouse.y + offset.y), canvas.width - 6, 32);
	context.fillText('canvas: ' + canvas.width + ', ' + canvas.height, canvas.width - 6, 46);
	context.fillText('offset: ' + offset.x + ', ' + offset.y, canvas.width - 6, 60);
	var o = calcMouseOffset();
	context.fillText('new: ' + o.x + ', ' + o.y, canvas.width - 6, 74);
	if (cMe) {
		context.fillText('cMe: ' + cMe.t.x + ', ' + cMe.t.y, canvas.width - 6, 88);
	}
	if (sMe) {
		context.fillText('sMe: ' + sMe.t.x + ', ' + sMe.t.y, canvas.width - 6, 102);
	}
}

function drawChats(ctx, chats) {
	ctx.font = '16px sans-serif';
	ctx.textAlign = 'left';

	for (var i = 0, len = chats.length; i < len; i += 1) {
		var chat = chats[i];
		var txt = chat.v.valueOf();
		var o = chat.o.valueOf();
		var chatW = ctx.measureText(txt).width;

		ctx.globalAlpha = o;

		ctx.fillStyle = '#fff';
		ctx.fillRect(-5, 20 - (len - i) * 20, chatW + 10, -26);
		ctx.lineWidth = 2;
		ctx.strokeRect(-5, 20 - (len - i) * 20, chatW + 10, -26);
		ctx.fillStyle = '#000';
		ctx.fillText(txt, 0, 13 - (len - i) * 20);
	}
}

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	if (debug) {
		drawDebugText();
	}
	if (!sprite || !cCats) {
		return;
	}
	var names = Object.keys(cCats);
	for (var i = 0, len = names.length; i < len; i += 1) {
		var name = names[i];
		var cat = cCats[name].t;
		var chat = cCats[name].c;

		var x = cat.x - sprite.width / 2 - offset.x;
		var y = cat.y - sprite.height / 2 - offset.y;

		context.save();
		context.translate(x, y);
		
		// set alpha
		if (cat.o < 1) {
			context.globalAlpha = cat.o.valueOf();
		}

		// draw cat name
		context.font = 'bold 8pt sans-serif';
		context.textAlign = 'center';
		context.fillText(name, sprite.height / 2, sprite.height + 12);

		// set cat flip
		if (cat.d == 'l') {
			context.translate(sprite.width, 0);
			context.scale(-1, 1);
		}

		// draw cat

		context.drawImage(sprite, 0, 0);

		// draw chat
		if (chat && chat.length) {
			
			// flip back
			if (cat.d == 'l') {
				context.scale(-1, 1);
				context.translate(-sprite.width, 0);
			}

			drawChats(context, chat);
		}

		context.restore();
	}
}

function resizeCanvas() {
	var chat = document.getElementById('chat');
	chat.style.width = (window.innerWidth - 10) + 'px';

	canvas.width = window.innerWidth;
	canvas.height = Math.min(map.height, window.innerHeight - chat.clientHeight - 10);

	halfCanvasW = Math.round(canvas.width / 2);
	halfCanvasH = Math.round(canvas.height / 2);

	updateOffset();

	draw();
}

function update() {
	var name, tween;

	for (name in tweens) {
		tween = tweens[name];
		tween.update();
	}

	for (name in chatTweens) {
		tween = chatTweens[name];
		tween.update();
	}
}

function animate() {
	raf(animate);

	if (!cCats) {
		return;
	}

	update();

	var catsVersion = cCats.getVersion();
	
	if (lastCats === catsVersion) {
		return;
	}

	draw();

	lastCats = catsVersion;
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
	cMe = cCats[name];

	// set initial offset relative to your cat position
	updateOffset();

	sMe.on('readable', handleSMeReadable);
	sMe.on('destroy', handleSMeDestroy);

	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';

	setupChatHooks();
}

function updateCat(o) {
	var name = this.name;
	var cat = cCats[name].t;

	var newX = o.hasOwnProperty('x') ? Math.round(o.x) : cat.x.valueOf();
	var newY = o.hasOwnProperty('y') ? Math.round(o.y) : cat.y.valueOf();
	var newO = o.hasOwnProperty('o') ? o.o : cat.o.valueOf();
	var newD = cat.d;

	if (newX > cat.x) {
		newD = 'r';
	} else if (newX < cat.x) {
		newD = 'l';
	}

	if (newX == cat.x && newY == cat.y && newD == cat.d && newO == cat.o) {
		return;
	}

	cat.assign({ x: newX, y: newY, d: newD, o: newO });

	if (cMe && cMe.getKey() === name) {
		updateOffset();
	}
}

function handleMoveCat() {
	var name = this.getParent().getKey();
	var oldT = cCats[name].t;
	var newT = this;

	var tween = Tween({ x: oldT.x.valueOf(), y: oldT.y.valueOf() })
		.to({ x: newT.x.valueOf(), y: newT.y.valueOf() })
		.duration(500)
		.ease('in-out-sine')
		.update(updateCat);
	tween.name = name;
	tweens[name] = tween;
}

function updateChat(o) {
	this.c.set('o', o.o);
}

function now() {
	return new Date().getTime();
}

function handleAddChat(index) {
	var name = this.getParent().getKey();
	var c = cCats[name].c;
	
	c.push({ v: this[index], o: 0 });
	
	var tween = Tween({ o: 0 })
		.to({ o: 1 })
		.duration(750)
		.ease('out-expo')
		.update(updateChat);
	tween.c = c[c.length - 1];

	var tweenName = name + '-' + now();
	chatTweens[tweenName] = tween;

	tween.on('end', function () {
		delete chatTweens[tweenName];
	});
}

function handleDelChat() {
	var name = this.getParent().getKey();
	var c = cCats[name].c;

	var tween = Tween({ o: 1 })
		.to({ o: 0 })
		.duration(750)
		.ease('out-expo')
		.update(updateChat);

	var toDel = 0;

	while (c[toDel].d) {
		toDel += 1;
	}

	tween.c = c[toDel];

	c[toDel].set('d', true);
	
	var tweenName = name + '-' + now();
	chatTweens[tweenName] = tween;

	tween.on('end', function () {
		cCats[name].c.shift();
		delete chatTweens[tweenName];
	});
}

function handleAddCat(name) {
	console.log('cat added:', name);

	var cat = sCats[name];
	var t = { x: cat.t.x.valueOf(), y: cat.t.y.valueOf(), d: cat.t.d.valueOf(), o: 0 };

	cCats.set(name, { t: t, c: [] });

	var tween = Tween({ o: 0 })
		.to({ o: 1 })
		.duration(600)
		.ease('out-expo')
		.update(updateCat);
	tween.name = name;
	tweens[name] = tween;

	cat.t.on('readable', handleMoveCat);
	cat.c.on('add', handleAddChat);
	cat.c.on('del', handleDelChat);
}

function handleDelCat(name) {
	console.log('cat deleted:', name);
	var tween = Tween({ o: 1 })
		.to({ o: 0 })
		.duration(600)
		.ease('out-expo')
		.update(updateCat);
	tween.name = name;
	tweens[name] = tween;
	tween.on('end', function () {
		cCats.del(name);
		delete tweens[name];
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
	sCats.on('del', handleDelCat);
}

function handleWindowMouseMove(event) {
	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	mouse.x = eX;
	mouse.y = eY;
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

	canvas = document.getElementById('canvas');
	context = canvas.getContext('2d');

	window.addEventListener('mouseup', handleWindowMouseUp);

	if (debug) {
		window.addEventListener('mousemove', handleWindowMouseMove);
	}

	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();

	sprite = new Image();
	sprite.src = '/images/c1.png';

	animate();
}

document.addEventListener("DOMContentLoaded", contentLoaded);

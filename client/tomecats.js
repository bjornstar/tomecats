var raf = require('raf');
var Tome = require('tomes').Tome;
var Tween = require('tween');

var socket = io.connect();

var map = { width: 2000, height: 500 };
var halfCanvasW = 0;
var halfCanvasH = 0;
var chatSize = 100;

var sCats, me, sMe, cMe, canvas, context, sprite, prop, lastCats, dragging, merging, chatStarted, gameData;
var cCats = Tome.conjure({});
var tweens = {};
var chatTweens = {};
var offset = { x: 0, y: 0 };
var mouse = { x: 0, y: 0 };

function handleWindowMouseUp(event) {
	if (event.target.tagName !== 'CANVAS') {
		return;
	}

	if (!sMe) {
		return;
	}

	// get mouse coords
	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	// calculate real map coords

	var dX = eX + offset.x;
	var dY = eY + offset.y;

	var newX = Math.max(Math.min(dX, map.width - sprite.width / 2), sprite.width / 2);
	var newY = Math.max(Math.min(dY, map.height - sprite.height / 2), sprite.width / 2);

	sMe.t.assign({ x: newX, y: newY, d: 'l' });

	//offset = calcMouseOffset();
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

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);

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

	context.lineWidth = 10;
	context.strokeRect(0 - offset.x, 0 - offset.y, Math.max(map.width * 2 - canvas.width, map.width) - offset.x, Math.max(map.height * 2 - canvas.height, map.height) - offset.y);

	if (!sprite || !cCats) {
		return;
	}
	var names = Object.keys(cCats);
	for (var i = 0, len = names.length; i < len; i += 1) {
		var name = names[i];
		var cat = cCats[name].t;
		var chat = cCats[name].c;

		context.save();

		// set cat alpha
		if (cat.o < 1) {
			context.globalAlpha = cat.o;
		}

		// set cat flip
		/*if (cat.d == 'l') {
		context.translate(canvas.width, 0);
		context.scale(-1, 1);
		}*/
		/*if (cat.d == 'r') {
		context.translate(canvas.width, 0);
		context.scale(-1, 1);
		context.drawImage(sprite, canvas.width - cat.x - hW, cat.y - hH);
		} else {
		context.drawImage(sprite, 0, 0);
		}*/

		// draw cat
		var x = cat.x - sprite.width / 2 - offset.x;
		var y = cat.y - sprite.height / 2 - offset.y;

		context.drawImage(sprite, x, y);

		// draw cat name
		context.font = 'bold 8pt sans-serif';
		context.textAlign = 'center';
		context.fillText(name, x + sprite.height / 2, y + sprite.height + 12);

		if (chat && chat.length) {
			context.font = '10pt sans-serif';
			context.textAlign = 'center';
			context.fillText(chat[chat.length-1], x + sprite.height / 2, y - 12);
		}

		context.restore();
	}
}

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - chatSize;
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
		//return;
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
	console.log('merging diff');
	merging = true;
	sCats.merge(diff);
	sCats.read();
	merging = false;
}

function handleChatInput(e) {
	if (e.keyCode === 13) {
		sMe.c.push(e.srcElement.value);
		e.srcElement.value = '';
		e.preventDefault();
		e.stopPropagation();
	}
}

function setupChatHooks() {
	if (chatStarted) {
		return;
	}

	var chatinput = document.getElementById('chatin');
	chatinput.addEventListener('keydown', handleChatInput);

	chatStarted = true;

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
	console.log('Name set to', name);
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

function catUpdate(o) {
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

function handleCatMove() {
	var name = this.getKey();
	var oldT = cCats[name].t;
	var newT = this.t;

	var tween = Tween({ x: oldT.x.valueOf(), y: oldT.y.valueOf() })
		.to({ x: newT.x.valueOf(), y: newT.y.valueOf() })
		.duration(500)
		.ease('in-out-sine')
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;
}

function handleChatAdd(index) {
	console.log(this);
	var name = this.getParent().getKey();
	cCats[name].c.push(this[index]);
}

function handleChatDel(index) {
	console.log(this);
	var name = this.getParent().getKey();
	cCats[name].c.shift();
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
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;

	cat.on('readable', handleCatMove);
	cat.c.on('add', handleChatAdd);
	cat.c.on('del', handleChatDel);
}

function handleDelCat(name) {
	console.log('cat deleted:', name);
	var tween = Tween({ o: 1 })
		.to({ o: 0 })
		.duration(600)
		.ease('out-expo')
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;
	tween.on('end', function () {
		cCats.del(name);
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

function handleWindowMouseDown(event) {
	if (!sMe) {
		return;
	}

	if (event.target.tagName !== 'CANVAS') {
		return;
	}

	var cat = cCats[sMe.getKey()].t;

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	var hW = Math.round(sprite.width / 2);
	var hH = Math.round(sprite.height / 2);

	if (eX > cat.x - hW &&
		eX < cat.x + hW / 2 &&
		eY > cat.y - hH / 2 &&
		eY < cat.y + hH / 2) {
		dragging = true;
	}
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
	var name = document.getElementById('name');
	name.focus();

	name.addEventListener('keydown', function (e) {
		if (e.keyCode === 13) {
			setName(e.srcElement.value);
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

	//window.addEventListener('mousedown', handleWindowMouseDown);
	window.addEventListener('mouseup', handleWindowMouseUp);
	window.addEventListener('mousemove', handleWindowMouseMove);

	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();

	sprite = new Image();
	sprite.src = '/images/c1.png';

	animate();
}

document.addEventListener("DOMContentLoaded", contentLoaded);

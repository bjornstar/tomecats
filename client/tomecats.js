var raf = require('raf');
var Tome = require('tomes').Tome;
var Tween = require('tween');

var socket = io.connect();

var playground;

var map = { width: 1000, height: 1000 };
var halfCanvasW = 0;
var halfCanvasH = 0;
var chatSize = 100;

var sCats, me, canvas, context, sprite, prop, lastCats, dragging, merging, chatStarted;
var cCats = Tome.conjure({});
var tweens = {};
var chatTweens = {};
var scroll = { x: 0, y: 0 };

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - chatSize;
	halfCanvasW = Math.round(canvas.width / 2);
	halfCanvasH = Math.round(canvas.height / 2);
	draw();
}

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	if (sprite && cCats) {
		context.save();
		context.lineWidth = 10;
		context.strokeRect(-scroll.x, -scroll.y, map.width, map.height);
		context.restore();

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
			var x = -scroll.x + cat.x - sprite.width / 2;
			var y = -scroll.y + cat.y - sprite.height / 2;
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
}

function update() {
	if (scroll.tween) {
		scroll.tween.update();
	}

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

function handleMeDestroy() {
	me = undefined;
}

function handleMeReadable() {
	if (merging) {
		return;
	}

	var diff = me.read();

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
		me.c.push(e.srcElement.value);
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
	me = sCats[name];

	// set initial scroll relative to your cat position

	var cat = me.t;

	me.on('readable', handleMeReadable);
	me.on('destroy', handleMeDestroy);

	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';

	setupChatHooks();
}

function scrollUpdate(o) {
	scroll.x = o.x;
	scroll.y = o.y;
}

function catUpdate(o) {
	var name = this.name;
	var cat = cCats[name].t;

	var newX = o.hasOwnProperty('x') ? Math.round(o.x) : cat.x;
	var newY = o.hasOwnProperty('y') ? Math.round(o.y) : cat.y;
	var newO = o.hasOwnProperty('o') ? o.o : cat.o;
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
}

function handleCatMove() {
	var name = this.getParent().getKey();
	var t = getCatPX(this);

	var domCat = document.getElementById(name);
	domCat.style.left = t.x;
	domCat.style.top = t.y;
}

function handleChatAdd(index) {
	var name = this.getParent().getKey();
	cCats[name].c.push(this[index]);
}

function handleChatDel(index) {
	var name = this.getParent().getKey();
	cCats[name].c.shift();
}

function getCatPX(cat) {
	var width = 100;
	var height = 91;

	var x = cat.x - Math.round(width / 2);
	var y = cat.y - Math.round(height / 2);

	return { x: x.toString().concat('px'), y: y.toString().concat('px') };
}

function handleAddCat(name) {
	console.log('cat added:', name);

	var cat = sCats[name];

	var t = getCatPX(cat.t);

	var domCat = document.createElement('DIV');
	domCat.id = name;
	domCat.className = cat.t.s.concat(' cat');
	domCat.style.setProperty('left', t.x);
	domCat.style.setProperty('top', t.y);

	playground.appendChild(domCat);

	cat.t.on('readable', handleCatMove);
	cat.c.on('add', handleChatAdd);
	cat.c.on('del', handleChatDel);
}

function handleDelCat(name) {
	console.log('cat deleted:', name);
	var tween = Tween({ o: 1 })
		.to({ o: 0 })
		.duration(300)
		.ease('out-expo')
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;
	tween.on('end', function () {
		cCats.del(name);
	});
}

function handleCats(data) {
	console.log('cats!', data);

	sCats = Tome.conjure(data);
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
	if (!me) {
		return;
	}

	if (event.target.tagName !== 'CANVAS') {
		return;
	}

	var cat = cCats[me.getKey()].t;

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
	if (!dragging) {
		return;
	}

	if (!me) {
		return;
	}

	var cat = cCats[me.getKey()].t;

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	var newX = Math.min(eX, canvas.width);
	var newY = Math.min(eY, canvas.height);

	newX = Math.max(newX, 0);
	newY = Math.max(newY, 0);

	var newD = cat.d;

	if (newX > cat.x) {
		newD = 'r';
	} else if (newX < cat.x) {
		newD = 'l';
	}

	if (cat.x == newX && cat.y == newY && cat.d == newD) {
		return;
	}

	cat.assign({ x: newX, y: newY, d: newD });
}

function handleWindowMouseUp(event) {
	console.log(event);
	if (!me) {
		return;
	}

	// get cat
	var cat = me.t;

	// get mouse position in canvas
	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	cat.assign({ x: eX, y: eY });
}

socket.on('cats', handleCats);
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

	playground = document.getElementById('playground');

	window.addEventListener('mousedown', handleWindowMouseDown);
	window.addEventListener('mouseup', handleWindowMouseUp);
	window.addEventListener('mousemove', handleWindowMouseMove);
}

document.addEventListener("DOMContentLoaded", contentLoaded);

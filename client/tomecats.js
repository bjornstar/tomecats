var raf = require('raf');
var Tome = require('tomes').Tome;
var Tween = require('tween');

var socket = io.connect();

var map = { height: 2000, width: 2000 };
var halfCanvasW = 0;
var halfCanvasH = 0;
var speed = 100;
var updateRate = 30;

var sCats, me, canvas, context, sprite, lastCats, dragging, merging;
var cCats = Tome.conjure({});
var tweens = {};
var scroll = { x: halfCanvasW, y: halfCanvasH };
var lastUpdate = new Date().getTime();

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 100;
	halfCanvasW = Math.round(canvas.width / 2);
	halfCanvasH = Math.round(canvas.height / 2);
	draw();
}

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	if (sprite && cCats) {

		var hW = Math.round(sprite.width / 2);
		var hH = Math.round(sprite.height / 2);

		context.save();
		context.translate(-scroll.x, -scroll.y);
		context.strokeRect(0, 0, map.width, map.height);
		context.restore();

		var names = Object.keys(cCats);
		for (var i = 0, len = names.length; i < len; i += 1) {
			var name = names[i];
			var cat = cCats[name].c;

			context.save();

			context.translate(cat.x - scroll.x, cat.y - scroll.y);

			if (cat.o < 1) {
				context.globalAlpha = cat.o;
			}

			context.font = "8pt sans-serif";
			context.fillText(name, 0, sprite.height + 12);

/*			if (cat.d == 'r') {
				context.translate(canvas.width, 0);
				context.scale(-1, 1);
				context.drawImage(sprite, canvas.width - cat.x - hW, cat.y - hH);
			} else {*/
				context.drawImage(sprite, 0, 0);
//			}

			context.restore();
		}
	}
}

function update() {
	if (scroll.tween) {
		scroll.tween.update();
	}

	for (var name in tweens) {
		var tween = tweens[name];
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

function handleBadName() {
	console.log('bad name.');
	var badname = document.getElementById('badname');
	badname.textContent = 'Invalid name, please try a different one.';
}

function handleNameSet(name) {
	console.log('Name set to', name);
	me = sCats[name];

	scroll.x = 0;
	scroll.y = 0;

	me.on('readable', handleMeReadable);
	me.on('destroy', handleMeDestroy);

	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';
}

function scrollUpdate(o) {
	scroll.x = o.x;
	scroll.y = o.y;
}

function catUpdate(o) {
	var name = this.name;
	var cat = cCats[name].c;

	var newX = o.hasOwnProperty('x') ? Math.round(o.x) : cat.x;
	var newY = o.hasOwnProperty('y') ? Math.round(o.y) : cat.y;
	var newO = o.hasOwnProperty('o') ? o.o : cat.o;
	var newD = cat.d.valueOf();

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

function calculateDistance(oX, oY, nX, nY) {
	return Math.round(Math.abs(oX - nX) + Math.abs(oY - nY));
}

function handleCatMove() {
	var name = this.getKey();
	
	var oldT = cCats[name].c;
	var newT = this.t;

	var distance = calculateDistance(oldT.x, oldT.y, newT.x, newT.y);
	var duration = Math.round(distance * 100 / speed);

	var tween = Tween({ x: oldT.x.valueOf(), y: oldT.y.valueOf() })
		.to({ x: newT.x.valueOf(), y: newT.y.valueOf() })
		.duration(500)
		.ease('in-out-sine')
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;
}

function handleAddCat(name) {
	console.log('cat added:', name);
	var cat = sCats[name];
	console.log(cat);
	var c = { x: cat.t.x.valueOf(), y: cat.t.y.valueOf(), d: cat.t.d.valueOf(), o: 0 };
	cCats.set(name, { c: c });
	var tween = Tween({ o: 0 })
		.to({ o: 1 })
		.duration(300)
		.ease('out-expo')
		.update(catUpdate);
	tween.name = name;
	tweens[name] = tween;
	cat.on('readable', handleCatMove);
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

function handleCanvasMouseDown(event) {
	if (!me) {
		return;
	}

	if (event.target.tagName !== 'CANVAS') {
		return;
	}

	var cat = cCats[me.getKey()].c;

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

	var cat = cCats[me.getKey()].c;

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

	var now = new Date().getTime();

	if (now - lastUpdate > updateRate) {
		lastUpdate = now;
		me.t.assign({ x: newX, y: newY, d: newD });
	}
}

function handleWindowMouseUp(event) {
	if (event.target.tagName !== 'CANVAS' && !dragging) {
		return;
	}

	if (!me) {
		return;
	}

	dragging = false;

	var cat = me.t;

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	eX += scroll.x;
	eY += scroll.y;

	var newX = Math.max(Math.min(eX, map.width - sprite.width), 0);
	var newY = Math.max(Math.min(eY, map.height - sprite.height), 0);

	var newD = cat.d;

	if (newX > cat.x) {
		newD = 'r';
	} else if (newX < cat.x) {
		newD = 'l';
	}

	var tween = Tween({ x: scroll.x, y: scroll.y });

	var newScrollX = Math.min(-halfCanvasW + scroll.x + newX - cat.x, map.width);
	var newScrollY = Math.min(-halfCanvasH + scroll.y + newY - cat.y, map.height);

	newScrollX = Math.max(newScrollX, 0);
	newScrollY = Math.max(newScrollY, 0);

	tween.to({ x: newScrollX, y: newScrollY })
		.ease('in-out-sine')
		.update(scrollUpdate);

	scroll.tween = tween;

	if (cat.x == newX && cat.y == newY && cat.d == newD) {
		return;
	}

	cat.assign({ x: newX, y: newY, d: newD });
}

socket.on('cats', handleCats);
socket.on('diff', handleDiff);

socket.on('badname', handleBadName);
socket.on('nameSet', handleNameSet);

socket.on('connect', function () {
	console.log('connected.');
});

function setName() {
	var name = document.getElementById('name');

	var badname = document.getElementById('badname');
	badname.textContent = '';

	socket.emit('setName', name.value);
}

function contentLoaded() {
	var name = document.getElementById('name');
	name.focus();

	name.addEventListener('keydown', function (e) {
		if (e.keyCode === 13) {
			setName();
		}
	});

	var setNameButton = document.getElementById('setName');

	setNameButton.addEventListener('click', function (e) {
		setName();

		e.preventDefault();
		e.stopPropagation();
	}, false);

	canvas = document.getElementById('canvas');
	context = canvas.getContext('2d');

	canvas.addEventListener('mousedown', handleCanvasMouseDown);
	window.addEventListener('mouseup', handleWindowMouseUp);
	window.addEventListener('mousemove', handleWindowMouseMove);

	window.addEventListener('resize', resizeCanvas, false);
	resizeCanvas();

	sprite = new Image();
	sprite.src = '/images/cat.png';

	animate();
}

document.addEventListener("DOMContentLoaded", contentLoaded);

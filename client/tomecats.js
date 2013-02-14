var raf = require('raf');
var Tome = require('tomes').Tome;

var socket = io.connect();

var cats, me, canvas, context, sprite, lastCats, dragging, merging;

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 100;
	draw();
}

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	if (sprite && cats) {
		for (var name in cats) {
			if (cats.hasOwnProperty(name)) {
				var cat = cats[name].c;

				var hW = Math.round(sprite.width / 2);
				var hH = Math.round(sprite.height / 2);
				
				if (cat.d == 'r') {
					context.save();
					context.translate(canvas.width, 0);
					context.scale(-1, 1);
					context.drawImage(sprite, canvas.width - cat.x - hW, cat.y - hH);
					context.restore();
				} else {
					context.drawImage(sprite, cat.x - hW, cat.y - hH);
				}

				context.font = "8pt sans-serif";
				context.fillText(name, cat.x, cat.y + hH + 12);
			}
		}
	}
}

function animate() {
	raf(animate);
	if (cats && lastCats !== cats.__version__) {
		draw();
		lastCats = cats.__version__;
	}
}

function handleMeDestroy() {
	me = undefined;
}

function handleMeReadable() {
	if (merging) {
		console.log('merging.');
		return;
	}

	var diff = me.read();

	if (diff) {
		socket.emit('diff', diff);
	}
}

function handleDiff(diff) {
	merging = true;
	cats.merge(diff);
	cats.read();
	merging = false;
}

function handleBadName() {
	console.log('bad name.');
	var badname = document.getElementById('badname');
	badname.textContent = 'Invalid name, please try a different one.';
}

function handleNameSet(name) {
	console.log('Name set to', name);
	me = cats[name];
	me.on('readable', handleMeReadable);
	me.on('destroy', handleMeDestroy);
}

function handleCats(data) {
	console.log('cats!', data);
	cats = Tome.conjure(data);
}

function handleCanvasMouseDown(event) {
	if (!me) {
		return;
	}

	var cat = me.c;

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

function handleWindowMouseUp() {
	dragging = false;
}

function handleWindowMouseMove(event) {
	if (!dragging) {
		return;
	}

	var cat = me.c;

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	var newX = Math.min(eX, canvas.width);
	var newY = Math.min(eY, canvas.height);

	newX = Math.max(newX, 0);
	newY = Math.max(newY, 0);

	var newD = cat.d;

	if (newX > cat.x && cat.d !== 'r') {
		newD = 'r';
	} else if (newX < cat.x && cat.d !== 'l') {
		newD = 'l';
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

function contentLoaded() {
	var name = document.getElementById('name');
	name.focus();

	var setNameButton = document.getElementById('setName');

	setNameButton.addEventListener('click', function (e) {
		var name = document.getElementById('name');

		var badname = document.getElementById('badname');
		badname.textContent = '';
	
		socket.emit('setName', name.value);

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
	sprite.src = '/images/octopus.gif';

	animate();
}

document.addEventListener("DOMContentLoaded", contentLoaded);

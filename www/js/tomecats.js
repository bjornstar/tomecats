var socket = io.connect();
var cats, me, canvas, context, sprite, lastCats, dragging;

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight - 100;
	draw();
}

function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	if (sprite && cats) {
		for (var cat in cats) {
			if (cats.hasOwnProperty(cat)) {
				context.drawImage(sprite, cats[cat].x - Math.round(sprite.width / 2), cats[cat].y - Math.round(sprite.height / 2));
				context.font = "8pt sans-serif";
				context.fillText(cat, cats[cat].x, cats[cat].y + Math.round(sprite.height / 2) + 12);
			}
		}
	}
}

function animate() {
	window.requestAnimationFrame(animate);
	if (cats && lastCats !== cats.__version__) {
		draw();
		lastCats = cats.__version__;
	}
}

function handleMeReadable() {
	var diff = me.read();

	if (diff) {
		socket.emit('diff', diff);
	}
}

function handleDiff(diff) {
	cats.merge(diff);
	cats.read();
}

function handleBadName() {
	console.log('bad name.');
	var badname = document.getElementById('badname');
	badname.textContent = 'Invalid name, please try a different one.';
}

function handleFirstNameSet(name) {
	console.log('Name set to', name);
	me = cats[name];
	me.on('readable', handleMeReadable);
}

function handleCats(data) {
	console.log('cats!', data);
	cats = Tome.conjure(data);
}

function handleCanvasMouseDown(event) {
	if (!me) {
		return;
	}

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	if (eX > me.x - sprite.width / 2 &&
		eX < me.x + sprite.width / 2 &&
		eY > me.y - sprite.height / 2 &&
		eY < me.y + sprite.height / 2) {
		dragging = true;
	}
}

function handleWindowMouseUp(event) {
	dragging = false;
}

function handleWindowMouseMove(event) {
	if (!dragging) {
		return;
	}

	var eX = event.offsetX || event.clientX;
	var eY = event.offsetY || event.clientY;

	var newX = Math.min(eX, canvas.width);
	var newY = Math.min(eY, canvas.height);

	newX = Math.max(newX, 0);
	newY = Math.max(newY, 0);

	me.assign({ x: newX, y: newY });
}

socket.on('cats', handleCats);
socket.on('diff', handleDiff);

socket.on('badname', handleBadName);
socket.once('nameSet', handleFirstNameSet);

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

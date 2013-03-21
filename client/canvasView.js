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

//                                      _
//   ___ __ _ _ ____   ____ _ ___/\   /(_) _____      __
//  / __/ _` | '_ \ \ / / _` / __\ \ / / |/ _ \ \ /\ / /
// | (_| (_| | | | \ V / (_| \__ \\ V /| |  __/\ V  V /
//  \___\__,_|_| |_|\_/ \__,_|___/ \_/ |_|\___| \_/\_/
//

var EventEmitter = require('emitter');
var inherits = require('inherit');
var raf = require('raf');
var Tween = require('tween');
var Tome = require('tomes').Tome;

var id = 0;
var sprite = { width: 100, height: 91 };
var loadedSprites = {};
var catTweens = {};
var chatTweens = {};

function half(n) {
	return Math.floor(n / 2);
}

function update() {
	var name;

	for (name in catTweens) {
		catTweens[name].update();
	}

	for (name in chatTweens) {
		chatTweens[name].update();
	}

	console.log(catTweens);
}

function drawChats(ctx, chats) {
	ctx.font = '16px sans-serif';
	ctx.textAlign = 'left';

	for (var i = 0, len = chats.length; i < len; i += 1) {
		var chat = chats[i];
		var chatW = ctx.measureText(chat).width;

		ctx.fillStyle = '#fff';
		ctx.fillRect(-5, 20 - (len - i) * 20, chatW + 10, -26);
		ctx.lineWidth = 2;
		ctx.strokeRect(-5, 20 - (len - i) * 20, chatW + 10, -26);
		ctx.fillStyle = '#000';
		ctx.fillText(chat, 0, 13 - (len - i) * 20);
	}
}

function draw(view) {
	var canvas = view.canvas;
	var context = canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);

	for (var name in view.cats) {
		if (!view.cats.hasOwnProperty(name)) {
			continue;
		}

		var cat = view.cats[name];
		var pos = cat.pos;
		var chat = cat.chat;

		var x = pos.x - half(sprite.width) - view.offset.x;
		var y = pos.y - half(sprite.height) - view.offset.y;

		context.save();
		context.translate(x, y);

		context.font = 'bold 8pt sans-serif';
		context.textAlign = 'center';
		context.fillText(name, half(sprite.height), 0);

		// set cat flip
		if (pos.d == 'l') {
			context.translate(sprite.width, 0);
			context.scale(-1, 1);
		}

		context.drawImage(loadedSprites[cat.catType.valueOf()], 0, 0);
		context.drawImage(loadedSprites[cat.propType.valueOf()], 0, 0);

		// draw chat
		if (chat.length) {

			// flip back
			if (pos.d == 'l') {
				context.scale(-1, 1);
				context.translate(-sprite.width, 0);
			}

			drawChats(context, chat);
		}

		context.restore();
	}
}

function updateOffset(view) {
	var meX = view.ref ? view.ref.pos.x : 0;
	var meY = view.ref ? view.ref.pos.y : 0;

	view.offset.x = Math.min(Math.max(meX - view.halfCanvasW, 0), Math.max(view.map.width - view.canvas.width, 0));
	view.offset.y = Math.min(Math.max(meY - view.halfCanvasH, 0), Math.max(view.map.height - view.canvas.height, 0));
}

function resizeCanvas(view) {
	var canvas = view.canvas;
	
	canvas.width = Math.min(view.map.width, window.innerWidth);
	canvas.height = Math.min(view.map.height, window.innerHeight);

	view.halfCanvasW = half(canvas.width);
	view.halfCanvasH = half(canvas.height);

	updateOffset(view);
	draw(view);
}

function start(view) {
	function animate() {
		raf(animate);

		update(view);

		draw(view);
	}
	animate();
}

function loadSprite(spriteName) {
	if (loadedSprites[spriteName]) {
		return;
	}

	loadedSprites[spriteName] = new Image();
	loadedSprites[spriteName].src = 'images/' + spriteName + '.png';
}

function updateCat(o) {
	var name = this.name;
	var view = this.view;

	var catPos = view.cats[name].pos;

	var newX = o.hasOwnProperty('x') ? Math.round(o.x) : catPos.x.valueOf();
	var newY = o.hasOwnProperty('y') ? Math.round(o.y) : catPos.y.valueOf();
	var newO = o.hasOwnProperty('o') ? o.o : catPos.o.valueOf();
	var newD = catPos.d;

	if (newX > catPos.x) {
		newD = 'r';
	} else if (newX < catPos.x) {
		newD = 'l';
	}

	if (catPos.x.is(newX) && catPos.y.is(newY) && catPos.d.is(newD) && catPos.o.is(newO)) {
		return;
	}

	catPos.assign({ x: newX, y: newY, d: newD, o: newO });
	view.cats.read();
}

function createCatTween(view, cat) {
	var name = cat.getKey();
	console.log('creating tween for', name);
	var currentPos = view.cats[name].pos;

	var newPos = cat.pos;

	var tween = Tween({ x: currentPos.x.valueOf(), y: currentPos.y.valueOf() })
		.to({ x: newPos.x.valueOf(), y: newPos.y.valueOf() })
		.duration(500)
		.ease('in-out-sine')
		.update(updateCat);
	
	tween.on('end', function () {
		delete catTweens[name];
	});

	tween.name = name;
	tween.view = view;
	catTweens[name] = tween;
}

function CanvasView(map, ref) {
	EventEmitter.call(this);

	this.id = 'canvasview' + id;
	this.map = map || { width: 2000, height: 400 };
	this.ref = ref;
	this.offset = { x: 0, y: 0 };
	this.cats = Tome.conjure({});

	var canvas = this.canvas = document.createElement('CANVAS');
	canvas.className = 'view';
	canvas.id = this.id;

	id += 1;

	this.halfCanvasW = half(canvas.width);
	this.halfCanvasH = half(canvas.height);

	document.body.appendChild(canvas);

	resizeCanvas(this);

	var that = this;

	window.addEventListener('resize', function () {
		resizeCanvas(that);
	}, false);

	canvas.addEventListener('mouseup', function(event) {
		var eX = event.pageX;
		var eY = event.pageY;

		var dX = eX + that.offset.x;
		var dY = eY + that.offset.y;

		var newX = Math.max(Math.min(dX, that.map.width - sprite.width / 2), sprite.width / 2);
		var newY = Math.max(Math.min(dY, that.map.height - sprite.height / 2 + 6), sprite.width / 2);
		
		that.emit('newCoords', newX, newY);
	});

	start(this);
}

inherits(CanvasView, EventEmitter);

CanvasView.prototype.addCat = function (cat) {
	var name = cat.getKey();
	this.cats.set(name, cat);
	this.cats[name].pos.set('o', 1);

	loadSprite(cat.catType.valueOf());
	loadSprite(cat.propType.valueOf());

	var that = this;

	cat.pos.on('readable', function () {
		console.log('readable', JSON.stringify(cat));
		createCatTween(that, cat);
	});

	cat.on('destroy', function () {
		that.cats.del(name);
	});
};

CanvasView.prototype.setRef = function (ref) {
	this.ref = ref;

	var that = this;

	this.ref.pos.on('readable', function () {
		updateOffset(that);
	});
};

exports.CanvasView = CanvasView;
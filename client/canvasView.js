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

var id = 0;
var sprite = { width: 100, height: 91 };

function half(n) {
	return Math.floor(n / 2);
}

function update(view) {

}

function draw(view) {
	var canvas = view.canvas;
	var context = canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);

	for (var name in view.cats) {
		var cat = view.cats[name].pos;

		var x = cat.x - half(sprite.width) - view.offset.x;
		var y = cat.y - half(sprite.height) - view.offset.y;

		context.save();
		context.translate(x, y);

		context.font = 'bold 8pt sans-serif';
		context.textAlign = 'center';
		context.fillText(name, half(sprite.height), sprite.height + 12);

		context.restore();
	}
}

function updateOffset(view) {
	var meX = view.ref ? view.ref.t.x : 0;
	var meY = view.ref ? view.ref.t.y : 0;

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

function CanvasView(map, ref) {
	EventEmitter.call(this);

	this.id = 'canvasview' + id;
	this.map = map || { width: 1000, height: 400 };
	this.ref = ref;
	this.offset = { x: 0, y: 0 };
	this.cats = {};

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

	start(this);
}

inherits(CanvasView, EventEmitter);

CanvasView.prototype.add = function (cat) {
	var name = cat.getKey();
	this.cats[name] = cat;

	cat.on('destroy', function () {
		delete this.cats[name];
	});
};

CanvasView.prototype.setRef = function (ref) {
	this.ref = ref;
};

exports.CanvasView = CanvasView;
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

function CanvasView(id, map, ref) {
	EventEmitter.call(this);

	this.id = id;
	this.map = map;
	this.ref = ref;
	this.offset = { x: 0, y: 0 };

	var view = this.view = document.createElement('CANVAS');
	view.className = 'view';
	view.id = id;

	if (!document.getElementById(view.id)) {
		document.body.appendChild(view);
	}

	window.addEventListener('resize', this.resizeCanvas, false);
	this.resizeCanvas();
}

inherits(CanvasView, EventEmitter);

CanvasView.prototype.resizeCanvas = function() {
	var canvas = this.view;
	
	canvas.width = window.innerWidth;
	canvas.height = Math.min(map.height, window.innerHeight - chat.clientHeight - 10);

	this.updateOffset();

	this.draw();
};


CanvasView.prototype.draw = function() {
	var canvas = this.canvas;
	var context = this.canvas.getContext('2d');

	context.clearRect(0, 0, canvas.width, canvas.height);
};

CanvasView.prototype.animate = function() {
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
};

CanvasView.prototype.updateOffset = function() {
	var meX = cMe ? cMe.t.x : 0;
	var meY = cMe ? cMe.t.y : 0;

	this.offset.x = Math.min(Math.max(meX - halfCanvasW, 0), Math.max(map.width - canvas.width, 0));
	this.offset.y = Math.min(Math.max(meY - halfCanvasH, 0), Math.max(map.height - canvas.height, 0));
};

exports.CanvasView = CanvasView;
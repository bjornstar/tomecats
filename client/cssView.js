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

//                     _
//   ___ ___ ___/\   /(_) _____      __
//  / __/ __/ __\ \ / / |/ _ \ \ /\ / /
// | (__\__ \__ \\ V /| |  __/\ V  V /
//  \___|___/___/ \_/ |_|\___| \_/\_/
//

var EventEmitter = require('emitter');
var inherits = require('inherit');

function CssView(id, map, ref) {
	EventEmitter.call(this);

	this.id = id;
	this.map = map;
	this.ref = ref;
	this.offset = { x: 0, y: 0 };

	var view = this.view = document.createElement('DIV');
	view.className = 'view';
	view.id = id;

	if (!document.getElementById(view.id)) {
		document.body.appendChild(view);
	}

	var that = this;
	view.addEventListener('mouseup', function(event) {
		var newX = event.pageX;
		var newY = event.pageY;
		that.emit('newCoords', newX, newY);
	});
}

inherits(CssView, EventEmitter);

CssView.prototype.add = function (element) {
	this.view.appendChild(element);
};

CssView.prototype.remove = function (element) {
	this.view.removeChild(element);
};

exports.CssView = CssView;
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
var Catainer = require('./catainer').Catainer;

var id = 0;

function CssView(map, ref) {
	EventEmitter.call(this);

	this.id = 'cssview' + id;
	this.map = map;
	this.ref = ref;
	this.offset = { x: 0, y: 0 };

	var view = this.view = document.createElement('DIV');
	view.className = 'view';
	view.id = id;

	id += 1;

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

CssView.prototype.add = function (cat) {
	var myCatainer = new Catainer(cat);

	var element = myCatainer.rootElement;
	this.view.appendChild(element);

	cat.pos.on('readable', function () {
		myCatainer.update();
	});

	cat.on('destroy', function () {
		myCatainer.destroy();
	});

	cat.chat.on('add', function (index) {
		var chatText = this[index];
		
		var chatDiv = myCatainer.chat(chatText);

		// The server takes care of cleaning up chat messages after a certain
		// period of time. All we need to do is listen for it to be destroyed
		// and remove the chat bubble.
		
		chatText.on('destroy', function () {
			myCatainer.destroyChat(chatDiv);
		});
	});
};

CssView.prototype.remove = function (element) {
	this.view.removeChild(element);
};

CssView.prototype.setRef = function (ref) {
	this.ref = ref;
};

exports.CssView = CssView;
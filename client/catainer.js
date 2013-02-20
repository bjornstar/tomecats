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

//    ___      _        _
//   / __\__ _| |_ __ _(_)_ __   ___ _ __
//  / /  / _` | __/ _` | | '_ \ / _ \ '__|
// / /__| (_| | || (_| | | | | |  __/ |
// \____/\__,_|\__\__,_|_|_| |_|\___|_|
// 

function Catainer(cat) {
	this.cat = cat;

	var name = cat.getKey();

	var cnt = this.cnt = document.createElement('div');
	cnt.className = 'catainer';
	cnt.style.transform = 'translate(' + cat.pos.x + 'px, ' + cat.pos.y + 'px)';
	cnt.style.webkitTransform = 'translate(' + cat.pos.x + 'px, ' + cat.pos.y + 'px)';

	// Create the cat.

	var div = this.div = document.createElement('div');
	div.className = 'cat';
	div.style.backgroundImage = 'url(/images/' + cat.catType + '.png)';
	div.style.transform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';
	div.style.webkitTransform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';

	// Now create the cat props.

	var prop = this.prop = document.createElement('div');
	prop.className = 'prop';
	prop.style.backgroundImage = 'url(/images/' + cat.propType + '.png)';
	prop.style.transform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';
	prop.style.webkitTransform = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';

	// And create the nametag.

	var nametag = this.nametag = document.createElement('div');
	nametag.className = 'nametag';
	nametag.textContent = name;

	// And the chat bubbles.

	var chatList = this.chatList = document.createElement('div');
	chatList.className = 'chatList';

	// Stick them all into the 'catainer'

	
	cnt.appendChild(div);
	cnt.appendChild(prop);
	cnt.appendChild(nametag);
	cnt.appendChild(chatList);

	// Finally, put the catainer onto the playground with the other cats.

	var playground = this.playground = document.getElementById('playground');
	playground.appendChild(cnt);


	// We want the cat to fade in. The default opacity of a catainer is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);
}

Catainer.prototype.move = function () {
	var movement = 'translate(' + this.cat.pos.x + 'px, ' + this.cat.pos.y + 'px)';
	var direction = 'scaleX(' + (this.cat.pos.d == 'l' ? -1 : 1) + ')';

	// We apply movement transforms to the whole catainer so that
	// everything moves together.

	this.cnt.style.transform = movement;
	this.cnt.style.webkitTransform = movement;

	// We want to be able to flip the cat left and right, but not the text
	// so we only apply the direction changes to the cat.

	this.div.style.transform = direction;
	this.div.style.webkitTransform = direction;

	// And of course we want the cat's props to stay on the cat so we flip
	// them too.

	this.prop.style.transform = direction;
	this.prop.style.webkitTransform = direction;
};

Catainer.prototype.destroy = function () {
	// We fade out the cat by setting the opacity to 0.
	var cnt = this.cnt;
	cnt.style.opacity = 0;

	var playground = this.playground;

	// and when the opacity reaches 0 we remove the cat from the playground.
	cnt.addEventListener('transitionEnd', function () {
		playground.removeChild(cnt);
	});

	cnt.addEventListener('webkitTransitionEnd', function () {
		playground.removeChild(cnt);
	});
};

Catainer.prototype.chat = function (chatText) {
	// Create a new chat bubble.
	var newChat = document.createElement('div');
	newChat.textContent = chatText;

	// Stick it on the chatList.
	var chatList = this.chatList;
	chatList.appendChild(newChat);

	// We want the chat bubbles to fade in just like our cat.
	setTimeout(function () {
		newChat.style.opacity = 1;
	}, 0);

	// And return that chat bubble so we can clean it up.
	return newChat;
};

Catainer.prototype.destroyChat = function(newChat) {
	var chatList = this.chatList;

	// Make the chat bubble fade out by setting the opacity to 0.
	newChat.style.opacity = 0;

	// And when the fade out is done, we remove the chat bubble.
	newChat.addEventListener('transitionEnd', function () {
		chatList.removeChild(newChat);
	});

	newChat.addEventListener('webkitTransitionEnd', function () {
		chatList.removeChild(newChat);
	});
};

exports.Catainer = Catainer;
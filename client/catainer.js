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

function transform(what, how) {
	what.style.transform = how;
	what.style.webkitTransform = how;
	what.style.msTransform = how;
}

function onEnd(what, then) {
	what.addEventListener('transitionEnd', then);
	what.addEventListener('webkitTransitionEnd', then);
	what.addEventListener('msTransitionEnd', then);
}

function Catainer(cat) {
	this.cat = cat;

	var position = 'translate(' + cat.pos.x + 'px, ' + cat.pos.y + 'px)';
	var direction = 'scaleX(' + (cat.pos.d == 'l' ? -1 : 1) + ')';

	var name = cat.getKey();

	var cnt = this.rootElement = document.createElement('div');
	cnt.className = 'catainer';
	transform(cnt, position);

	// Create the cat.

	var div = this.div = document.createElement('div');
	div.className = 'cat';
	div.style.backgroundImage = 'url(/images/' + cat.catType + '.png)';
	transform(div, direction);

	// Now create the cat props.

	var prop = this.prop = document.createElement('div');
	prop.className = 'prop';
	prop.style.backgroundImage = 'url(/images/' + cat.propType + '.png)';
	transform(prop, direction);

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

	// We want the cat to fade in. The default opacity of a catainer is 0, we
	// use setTimeout to trigger a transition.

	setTimeout(function () {
		cnt.style.opacity = 1;
	}, 0);
}

Catainer.prototype.update = function () {
	var movement = 'translate(' + this.cat.pos.x + 'px, ' + this.cat.pos.y + 'px)';
	var direction = 'scaleX(' + (this.cat.pos.d == 'l' ? -1 : 1) + ')';

	// We apply movement transforms to the whole catainer so that
	// everything moves together.

	transform(this.rootElement, movement);

	// We want to be able to flip the cat left and right, but not the text
	// so we only apply the direction changes to the cat.

	transform(this.div, direction);

	// And of course we want the cat's props to stay on the cat so we flip
	// them too.

	transform(this.prop, direction);
};

Catainer.prototype.destroy = function () {
	// We fade out the cat by setting the opacity to 0.
	var cnt = this.rootElement;
	cnt.style.opacity = 0;

	function removeCat(e) {
		// We might have multiple transitions, the one we want to pay attention
		// to is the one for opacity.

		if (e.propertyName !== 'opacity') {
			return;
		}

		var view = cnt.parentNode;
		view.removeChild(cnt);
		
		e.stopPropagation();
	}

	// and when the opacity reaches 0 we remove the cat from the playground.
	onEnd(cnt, removeCat);
};

Catainer.prototype.chat = function (chatText) {
	var catSoundTypes = [ { prefix: 'a', size: 5 }, { prefix: 'b', size: 3 }, { prefix: 'c', size: 5 } ];
	var catSoundBank = catSoundTypes[this.cat.catType.valueOf()[1] % 3];

	var rndAudioId = catSoundBank.prefix + (Math.floor(Math.random() * catSoundBank.size) + 1);

	var audio = document.getElementById(rndAudioId);

	if (audio) {
		audio.play();
	}

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

	function removeChat(e) {
		chatList.removeChild(newChat);
		e.stopPropagation();
	}

	// And when the fade out is done, we remove the chat bubble.
	onEnd(newChat, removeChat);
};

exports.Catainer = Catainer;
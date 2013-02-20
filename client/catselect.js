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

//    ___      _   __      _           _
//   / __\__ _| |_/ _\ ___| | ___  ___| |_
//  / /  / _` | __\ \ / _ \ |/ _ \/ __| __|
// / /__| (_| | |__\ \  __/ |  __/ (__| |_
// \____/\__,_|\__\__/\___|_|\___|\___|\__|
//


var EventEmitter = require('emitter');

function inherits(Child, Parent) {
	Child.prototype = Object.create(Parent.prototype, {
		constructor: { value: Child, enumerable: false, writable: true, configurable: true }
	});
}

exports = module.exports = new EventEmitter();

exports.CatSelect = function () {
	// Get the input box for our cat's name.
	var name = document.getElementById('name');

	// Set keyboard focus on it so we can start typing immediately.
	name.focus();

	// Listen for return.
	name.addEventListener('keydown', function (e) {
		var nameString = name.value;

		// If it's return and we have some text, login with that name.
		if (e.keyCode === 13 && nameString.length) {
			exports.hideBadName();
			exports.emit('login', nameString);
		}
	});


	var loginButton = document.getElementById('login');

	loginButton.addEventListener('click', function (e) {
		var nameString = name.value;

		// If we don't have any text, do nothing.
		if (!nameString.length) {
			return;
		}

		exports.hideBadName();

		// Login with that name.
		exports.emit('login', nameString);

		e.preventDefault();
		e.stopPropagation();
	}, false);
	return this;
};

exports.show = function() {
	// Show the welcome screen
	var welcome = document.getElementById('Welcome');
	welcome.style.display = '';

	// Show the blocker
	var blocker = document.getElementById('blocker');
	blocker.style.display = '';

	var name = document.getElementById('name');
	name.focus();
};

exports.hide = function() {
	// Hide the welcome screen.
	var welcome = document.getElementById('Welcome');
	welcome.style.display = 'none';

	// Hide the blocker.
	var blocker = document.getElementById('blocker');
	blocker.style.display = 'none';
};

exports.showBadName = function () {
	// Set the loginError text
	var loginError = document.getElementById('loginError');
	loginError.textContent = 'Invalid name, please try a different one.';

	exports.show();
};

exports.hideBadName = function () {
	// Clear the error text.
	var loginError = document.getElementById('loginError');
	loginError.textContent = '';
};

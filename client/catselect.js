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

exports = module.exports = new EventEmitter();

exports.CatSelect = function () {
	var catTypes = document.getElementById('catTypes');
	var propTypes = document.getElementById('propTypes');
	var nameDiv = document.getElementById('nameDiv');
	var name = document.getElementById('name');
	var yourCat = document.getElementById('yourCat');
	var startOver = document.getElementById('startOver');
	var propImg;

	startOver.addEventListener('mouseup', function () {
		catTypes.style.display = '';
		propTypes.style.display = 'none';
		nameDiv.style.display = 'none';
		if (propImg) {
			yourCat.removeChild(propImg);
			propImg = undefined;
		}
	});

	var catType, propType;

	catTypes.addEventListener('mouseup', function (e) {
		catType = e.target.id;

		catTypes.style.display = 'none';

		propTypes.className = catType;
		propTypes.style.display = 'block';
	});

	propTypes.addEventListener('mouseup', function (e) {
		propType = e.target.id;

		propTypes.style.display = 'none';

		nameDiv.className = catType + ' ' + propType;
		nameDiv.style.display = 'block';

		propImg = new Image();
		propImg.src = '/images/' + propType + '.png';
		yourCat.appendChild(propImg);

		name.focus();
	});

	// Listen for return.
	name.addEventListener('keydown', function (e) {
		var nameString = name.value;

		// If it's return and we have some text, login with that name.
		if (e.keyCode === 13 && nameString.length) {
			exports.hideBadName();
			exports.emit('login', nameString, catType, propType);
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
		exports.emit('login', nameString, catType, propType);

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

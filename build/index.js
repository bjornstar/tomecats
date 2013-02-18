var Builder = require('component-builder');
var fs      = require('fs');
var write   = fs.writeFileSync;
var mkdir   = fs.mkdirSync;

module.exports = function(req, res, next) {
	var builder = new Builder('.');
	builder.copyAssetsTo('public');
	builder.build(function (err, res) {
		if (err) return next(err);
		mkdir('public');
		write('public/tomecats.js', res.require + res.js);
		next();
	});
};
var Builder = require('component-builder');
var fs      = require('fs');
var write = fs.writeFileSync;

module.exports = function(req, res, next) {
	var builder = new Builder('.');
	builder.copyAssetsTo('public');
	builder.build(function (err, res) {
		if (err) return next(err);
		write('public/tomecats.js', res.require + res.js);
		next();
	});
};
var Builder = require('component-builder');
var fs      = require('fs');
var write   = fs.writeFileSync;
var mkdir   = fs.mkdirSync;

var configFileName = 'config.json';
var config = {};

var built = false;

module.exports = function(req, res, next) {
	if (built) {
		return next();
	}
	
	var builder = new Builder('.');
	builder.copyAssetsTo('public');
	builder.addLookup('node_modules');

	builder.on('config', function () {
		if (fs.existsSync(configFileName)) {
			var configString = fs.readFileSync(configFileName).toString();

			try {
				config = JSON.parse(configString);
			} catch (e) {
				console.warn('Failed to parse config.');
			}
		}
		builder.append('var config = ' + JSON.stringify(config) + ';');
	});

	builder.build(function (err, res) {
		if (err) return next(err);
		if (!fs.existsSync('public')) {
			mkdir('public');
		}
		write('public/tomecats.js', res.require + res.js);
		built = false;
		next();
	});
};

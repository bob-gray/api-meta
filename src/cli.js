"use strict";

var parseArgs = require("minimist"),
	builder = require("../src/builder.js");

module.exports.run = function () {
	var options = parseArgs(process.argv.slice(2), {
		alias: {
			"b": "basedir",
			"o": "output",
			"v": "version",
			"n": "name",
			"s": "src",
			"r": "readme"
		}
	});
	builder(options);
};
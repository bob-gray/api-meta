"use strict";

var createClass = require("solv/src/class"),
	Project = require("./Project"),
	madge = require("madge"),
	eachSegment = /[^\/]+/g,
	fs = require("fs"),
	path = require("path");

var AMDProject = createClass({
		name: "AMDProject",
		"extends": Project,
		"arguments": [{
			name: "properties",
			type: "object"
		}],
		properties: {
			basedir: "string",
			readme: "string",
			output: "string",
			amd: {
				type: "boolean",
				"default": true
			}
		}
	},
	init
);

module.exports = AMDProject;

function init () {
	this.src = path.join(this.basedir, "src");

	this.dependencies = madge(this.src, {
		format: "amd"
	});

	this.modules = Object.keys(this.dependencies.tree).sort().map(toModule, this);
}

function toModule (name) {
	return {
		name: name,
		pathPrefix: name.replace(eachSegment, ".."),
		src: fs.readFileSync(path.join(this.src, name +".js"), "utf-8")
	};
}
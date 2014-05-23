"use strict";

var createClass = require("solv/src/class"),
	Project = require("./Project"),
	madge = require("madge"),
	eachSegment = /[^\/]+/g,
	fs = require("fs");

var AMDProject = createClass({
		name: "AMDProject",
		"extends": Project,
		"arguments": [{
			name: "properties",
			type: "object"
		}],
		properties: {
			root: {
				type: "string",
				"default": "./"
			},
			src: {
				type: "string",
				"default": "src"
			},
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
	this.dependencies = madge(this.root + this.src, {
		format: "amd"
	});

	this.modules = Object.keys(this.dependencies.tree).sort().map(toModule, this);
}

function toModule (name) {
	return {
		name: name,
		pathPrefix: name.replace(eachSegment, ".."),
		src: fs.readFileSync(this.root + this.src + name +".js", "utf-8")
	};
}
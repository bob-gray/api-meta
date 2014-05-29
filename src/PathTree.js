"use strict";

var createClass = require("solv/src/class"),
	firstSlashToEnd = /\/.*$/,
	upToFirstSlash = /^[^\/]*\/?/;

var PathTree = createClass({
		name: "PathTree",
		"extends": require("solv/src/abstract/base"),
		"arguments": [{
			name: "paths",
			type: "array",
			"default": []
		}]
	},
	init
);

module.exports = PathTree;

function init (paths) {
	this.crumbs = [];
	this.paths = paths;
}

PathTree.method("explode", function () {
	return this.paths.reduce(this.proxy("walk"), {}).children;
});

PathTree.method("walk", function (parent, path, index, paths) {
	var head = path.replace(firstSlashToEnd, ""),
		tail = path.replace(upToFirstSlash, ""),
		child = this.getChild(parent, head);

	if (tail) {
		this.walk(child, tail, index, paths);

	} else {
		child.link = true;
		this.crumbs = [];
	}

	return parent;
});

PathTree.method ("getChild", function (parent, childName) {
	var index,
		child;

	if (!parent.children) {
		parent.children = [];
	}

	this.crumbs.push(childName);
	index = findChild(parent, childName);

	if (isFound(index)) {
		child = parent.children[index];

	} else {
		child = {
			name: childName,
			children: [],
			id: this.crumbs.join("/")
		};
	
		parent.children.push(child);
	}

	return child;
});
	
function findChild (parent, childName) {
	var index = -1;
	
	parent.children.forEach(function (child, i) {
		if (child.name === childName) {
			index = i;
		}
	});
	
	return index;
}

function isFound (index) {
	return index > -1;
}
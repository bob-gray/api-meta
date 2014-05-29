"use strict";

var createClass = require("solv/src/class");


var Project = createClass({
		name: "Project"
	}
);

module.exports = Project;

Project.method("getModuleNames", function () {
	return this.modules.map(toName);
});

Project.method("hasModule", function (name) {
	var names = this.getModuleNames();

	return arrayContains(names, name);
});

function toName (module) {
	return module.name;
}

function arrayContains (array, value) {
	var index = array.indexOf(value);

	return isFound(index);
}

function isFound (index) {
	return index > -1;
}
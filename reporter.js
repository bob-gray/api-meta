"use strict";

require("solv/src/object/for-each");

var meta = require("solv/src/meta"),
	createClass = require("solv/src/class"),
	Reporter,
	fs = require("fs"),
	templates = {
		head: fs.readFileSync("./templates/head.hbs", "utf-8"),
		list: fs.readFileSync("./templates/list.hbs", "utf-8"),
		foot: fs.readFileSync("./templates/foot.hbs", "utf-8"),
		module: fs.readFileSync("./templates/module.hbs", "utf-8")
	},
	Handlebars = require("handlebars");

Reporter = createClass(
	meta({
		"name": "Reporter",
		"description": "Builds documentation page",
		"arguments": []
	})
);

Reporter.method("render", function (module) {
	var head = templates.head(module),
		body = templates.module(module),

		modules = templates.list({
			pathPrefix: module.pathPrefix,
			modules: module.project.modules,
			moduleName: module.name
		}),

		foot = templates.foot({
			modules: modules
		});

	return head + body + foot;
});

module.exports = Reporter;

Handlebars.registerHelper("recursiveList", function recurse (items, pathPrefix, moduleName, options) {
	function isActive (id) {
		return id === moduleName.split("/", id.split("/").length).join("/");
	}

	function isCurrent (id) {
		return id === moduleName;
	}

	return items.map(function (child) {
		var children,
			classes = [];
		if (child.children.length) {
			children = recurse(child.children, pathPrefix, moduleName, options);
		}
		if (isCurrent(child.id)) {
			classes.push("current");
		}
		if (isActive(child.id)) {
			classes.push("active");
		}
		return options.fn({
			name: child.name,
			id: child.id,
			link: child.link,
			pathPrefix: pathPrefix,
			children: children,
			classList: classes.join(" ")
		});
	}).join("");
});

Object.forEach(templates, function (template, name) {
	this[name] = Handlebars.compile(template);
});
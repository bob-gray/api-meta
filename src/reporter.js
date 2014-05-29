"use strict";

require("solv/src/object/for-each");

var meta = require("solv/src/meta"),
	type = require("solv/src/type"),
	createClass = require("solv/src/class"),
	Reporter,
	fs = require("fs"),
	path = require("path"),
	markdown = require("markdown").markdown,
	templates = {
		head: fs.readFileSync(path.join(__dirname, "../templates/head.hbs"), "utf-8"),
		list: fs.readFileSync(path.join(__dirname, "../templates/list.hbs"), "utf-8"),
		foot: fs.readFileSync(path.join(__dirname, "../templates/foot.hbs"), "utf-8"),
		module: fs.readFileSync(path.join(__dirname, "../templates/module.hbs"), "utf-8")
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

		moduleTree = templates.list({
			pathPrefix: module.pathPrefix,
			moduleTree: module.project.moduleTree,
			moduleName: module.name
		}),

		foot = templates.foot({
			moduleTree: moduleTree
		});

	if (module.readme) {
		body += markdown.toHTML(module.readme);
	}

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

Handlebars.registerHelper("genericDocBlock", function (key, value, options) {
	var markup = "";

	if (!/name|type/.test(key)) {
		markup += "<h4>"+ key +"</h4>";

		if (type.is("object", value)) {
			markup += "<table>";

			Object.forEach(value, function (value, key) {
				markup += "<tr><td>"+ key +"</td><td>"+ value +"</td></tr>";
			});

			markup += "</table>"

		} else if (type.is("array", value)) {
			markup += buildTable(value);

		} else {
			markup +="<p>"+ value +"</p>"
		}
	}

	return markup;
});

function buildTable (array) {
	var columns = Object.keys(array.reduce(getKeys, {})),
		markup = "<table>";

	markup += buildHeaderRow(columns);

	array.forEach(function (data) {
		markup += buildRow(columns, data);
	});

	markup += "</table>";

	return markup;
}

function buildHeaderRow (columns) {
	return "<tr>" + columns.reduce(buildTh, "") +"</tr>";
}

function buildRow (columns, data) {
	return "<tr>"+ columns.reduce(buildTd.bind(data), "") +"</tr>";
}

function buildTd (row, column) {
	return row +"<td>"+ (this[column] || "") +"</td>";
}

function buildTh (row, column) {
	return row +"<th>"+ column +"</th>";
}

function getKeys (keys, object) {
	return Object.keys(object).reduce(getKey, keys);
}

function getKey (keys, key) {
	keys[key] = true;
	return keys;
}

Object.forEach(templates, function (template, name) {
	this[name] = Handlebars.compile(template);
});
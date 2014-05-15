"use strict";

require("solv/src/array/remove");

var fs = require("fs"),
	ncp = require("ncp"),
	madge = require("madge"),
	parseMeta = require("meta-json"),
	mkdirp = require("mkdirp"),
	Reporter = require("./reporter"),
	processMeta = require("./processor"),
	type = require("solv/src/type"),
	dependencies = madge("./node_modules/solv/src", {
		format: "amd"
	}),
	moduleIds = Object.keys(dependencies.tree).sort(),
	modules = moduleIds.map(toModule).filter(function (module) {
		if (module.noMeta) {
			moduleIds.remove(module.name)
		}

		return !module.noMeta;
	}),
	tree = [],
	graph = moduleIds.reduce(function (graph, module) {
		mkPath(graph, module);
		return graph;
	}, {}),
	project = {
		name: "solv",
		version: "0.0.2",
		modules: graph.children
	};

function mkPath (object, path) {
	var head = path.replace(/\/.*$/, ""),
		tail = path.replace(/^[^\/]*\/?/, ""),
		child = getChild(object, head);

	if (tail) {
		mkPath(child, tail);

	} else {
		child.link = true;
		tree = [];
	} 
}

function getChild (parent, childName) {
	var index,
		child;

	if (!parent.children) {
		parent.children = [];
	}

	tree.push(childName);
	index = findChild(parent, childName);

	if (index > -1) {
		child = parent.children[index];

	} else {
		child = {
			name: childName,
			children: [],
			id: tree.join("/")
		};
	
		parent.children.push(child);
	}

	return child;
}
	
function findChild (parent, childName) {
	var index = -1;
	
	parent.children.forEach(function (child, i) {
		if (child.name === childName) {
			index = i;
		}
	});
	
	return index;
}

modules.forEach(function (module) {
	module.requires = dependencies.tree[module.name].sort().map(buildRefLink, module);

	module.classes.forEach(function (Class) {
		var relatives = Class.mixins.map(function (mixin) {
				return mixin.name;
			}),
			extend = Class["extends"],
			Super = extend && getModuleByName(extend);

		if (Super) {
			relatives.unshift(Super.name);
		}

		Class.additionalMethods = getAdditionalMethods(relatives);

		Class.methods.sort(nameAscending);
		Class.events.sort(nameAscending);
		Class.mixins.sort(nameAscending);

		Class.mixins = Class.mixins.map(buildRefLink, module);

		if (Class["extends"]) {
			Class["extends"] = buildRefLink.call(module, Class["extends"]);
		}

		if (Class["arguments"].length) {
			Class.hasArgDescriptions = Class["arguments"].some(function (arg) {
				return arg.description != null || (arg.properties && !Object.isEmpty(arg.properties));
			});

			Class["arguments"].forEach(function (arg) {
				arg.hasDefault = type.is.not("undefined", arg["default"]);

				if (arg.properties) {
					Object.forEach(arg.properties, function (property, name) {
						this[name].hasDefault = type.is.not("undefined", this[name]["default"]);
					});
				}
			});
		}

		if (Class["extends"] || Class.mixins.length || Class.hasArgDescriptions) {
			Class.hasSuperOrMixinsOrArgs = true;
		}

		Class.methods.forEach(function (method) {
			method.hasArgDescriptions = method["arguments"].some(function (arg) {
				return arg.description != null;
			});

			method["arguments"].forEach(function (arg) {
				arg.hasDefault = type.is.not("undefined", arg["default"]);
			});

		});
	});

	module.functions.forEach(function (fn) {
		fn.hasArgDescriptions = fn["arguments"].some(function (arg) {
			return arg.description != null;
		});

		fn["arguments"].forEach(function (arg) {
			arg.hasDefault = type.is.not("undefined", arg["default"]);
		});
	});
});

function nameAscending (a, b) {
	return a.name < b.name ? -1 : a.name === b.name ? 0 : 1;
}

function getAdditionalMethods (relatives) {
	var additionalMethods = [],
		names = [];

	relatives.forEach(function (relative) {
		var module = getModuleByName(relative);

		if (module) {
			module.classes[0].methods.forEach(function (method) {
				var index = names.indexOf(method.name),
					meta = {
						name: method.name,
						href: module.pathPrefix +"/modules/"+ module.name +".html#method:"+ method.name
					};

				if (isFound(index)) {
					additionalMethods[index] = meta;

				} else {
					additionalMethods.push(meta);
					names.push(method.name);
				}				
			});
		}
	});

	additionalMethods.sort(nameAscending);

	return additionalMethods;
}

function isFound (index) {
	return index > -1;
}

function getModuleByName (name) {
	return modules.filter(function (module) {
		return module.name === name;
	})[0];
}

//fs.mkdirSync("./docs");

ncp("./includes", "./docs", function () {
	var reporter = new Reporter();

	fs.writeFileSync("./docs/index.html", reporter.render({
		name: "Solv",
		type: "Library",
		pathPrefix: ".",
		project: project
	}));

	modules.forEach(function (module) {
		var docDir = "./docs/modules/"+ module.name.replace(/\/[^\/]*$/, ""),
			page;

		module.project = project;

		if (!fs.exists(docDir)) {
			mkdirp.sync(docDir);
		}

		page = reporter.render(module)

		fs.writeFileSync("./docs/modules/"+ module.name +".html", page);
	});
});

function toModule (name) {
	var src = fs.readFileSync("./node_modules/solv/src/"+ name +".js", "utf-8"),
		meta,
		module;
	
	try {
		meta = parseMeta(src);
	} catch (error) {
		error.message += " Module: "+ name;
		throw error;
	}

	if (meta.length) {
		module = processMeta(meta);
		module.name = name;
		module.pathPrefix = name.replace(/[^\/]+/g, "..");

	} else {
		module = {
			name: name,
			noMeta: true
		};
	}

	return module;
}

function buildRefLink (name) {
	var module = this,
		dep = {
			name: name
		};

	if (isFound(moduleIds.indexOf(name))) {
		dep.href = module.pathPrefix +"/modules/"+ name +".html";

	} else {
		dep.classes = "private";
	}

	return dep;
}
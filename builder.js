"use strict";

require("solv/src/array/remove");

var fs = require("fs"),
	ncp = require("ncp"),
	parseMeta = require("meta-json"),
	mkdirp = require("mkdirp"),
	Reporter = require("./reporter"),
	processMeta = require("./processor"),
	PathTree = require("./PathTree"),
	AMDProject = require("./AMDProject"),
	type = require("solv/src/type"),
	project = new AMDProject({
		name: "solv",
		version: "0.2.3",
		root: "./node_modules/solv/",
		src: "src/",
		readme: "README.md"
	});

project.modules.forEach(function (module) {
	var meta;

	try {
		meta = parseMeta(module.src);
	} catch (error) {
		error.message += " Module: "+ name;
		throw error;
	}

	if (meta.length) {
		meta = processMeta(meta);
		Object.merge(module, meta);

	} else {
		module.noMeta = true;
	}
});

project.modules = project.modules.filter(function (module) {
	return !module.noMeta;
});

project.moduleTree = new PathTree(project.getModuleNames()).explode();

project.modules.forEach(prep);

//fs.mkdirSync("./docs");

ncp("./includes", "./docs", build);

function build () {
	var reporter = new Reporter(),
		readme = fs.readFileSync(project.root + project.readme, "utf-8"),
		homePage = reporter.render({
			name: "",
			type: "",
			readme: readme,
			pathPrefix: ".",
			project: project
		});

	fs.writeFileSync("./docs/index.html", homePage);

	project.modules.forEach(function (module) {
		var docDir = "./docs/modules/"+ module.name.replace(/\/[^\/]*$/, ""),
			page;

		module.project = project;

		if (!fs.exists(docDir)) {
			mkdirp.sync(docDir);
		}

		page = reporter.render(module)

		fs.writeFileSync("./docs/modules/"+ module.name +".html", page);
	});
}

function prep (module) {
	module.requires = project.dependencies.tree[module.name].sort().map(buildRefLink, module);

	module.classes.forEach(function (Class) {
		var relatives = Class.mixins.map(function (mixin) {
				return mixin.name;
			}),
			extend = Class["extends"];

		if (extend) {
			relatives.unshift(extend);
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
}

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
	return project.modules.filter(function (module) {
		return module.name === name;
	})[0];
}

function buildRefLink (name) {
	var module = this,
		dep = {
			name: name
		};

	if (project.hasModule(name)) {
		dep.href = module.pathPrefix +"/modules/"+ name +".html";

	} else {
		dep.classes = "private";
	}

	return dep;
}
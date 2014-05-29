"use strict";

require("solv/src/array/remove");
require("solv/src/object/merge");

var fs = require("fs"),
	path = require("path"),
	ncp = require("ncp"),
	parseMeta = require("meta-json"),
	mkdirp = require("mkdirp"),
	Reporter = require("./reporter"),
	processMeta = require("./processor"),
	PathTree = require("./PathTree"),
	AMDProject = require("./AMDProject"),
	type = require("solv/src/type");

module.exports = builder;

function builder (options) {
	var pkg = {},
		project,
		defaultOptions = {
			basedir: process.cwd(),
			readme: "README.md",
			output: "./docs"
		};

	options = Object.merge(defaultOptions, options);

	try {
		pkg = require(path.join(options.basedir, "package.json"));
	} catch (error) {
		console.log("Could find package.json");
	}
	
	options = Object.merge({}, pkg, options);

	options.output = path.join(options.basedir, options.output);

	project = new AMDProject(options);

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

	if (!fs.exists(project.output)) {
		mkdirp.sync(project.output);
	}

	ncp(path.join(__dirname, "../includes"), project.output, build);

	function build () {
		var reporter = new Reporter(),
			readmePath,
			homePage = reporter.render({
				name: "",
				type: "",
				pathPrefix: ".",
				project: project
			}),
			modulesDir = path.join(project.output, "modules");

		if (project.readme) {
			readmePath = path.join(project.basedir, project.readme);

			try {
				homePage.readme = fs.readFileSync(readmePath, "utf-8");
			} catch (error) {
				console.error("readme <%s> cannot be found", readmePath);
			}
		}

		fs.writeFileSync(path.join(project.output, "index.html"), homePage);

		project.modules.forEach(function (module) {
			var docDir = path.join(modulesDir, module.name.replace(/\/[^\/]*$/, "")),
				page;

			module.project = project;

			if (!fs.exists(docDir)) {
				mkdirp.sync(docDir);
			}

			page = reporter.render(module)

			fs.writeFileSync(path.join(modulesDir, module.name +".html"), page);
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
}
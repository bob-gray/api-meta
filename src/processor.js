"use strict";

require("solv/src/object/merge");
require("solv/src/object/for-each");

module.exports = process;

var signatures = require("solv/src/function/signatures"),
	type = require("solv/src/type"),
	processors = {
		"module": function  (meta, block) {
			Object.merge.deep(meta, block);
			meta.type = "module";
		},

		"class": function (meta, block) {
			meta.classes.push(block);

			block.type = "class";
			block.methods = [];
			block.staticMethods = [];
			block.events = [];

			if (type.is("string", block.mixins)) {
				block.mixins = [block.mixins];

			} else if (!block.mixins) {
				block.mixins = [];
			}

			if (block.properties) {
				block.properties = transformProperties(block.properties);
			}

			if (!block["arguments"]) {
				block["arguments"] = [];
			}

			block["arguments"].forEach(function (arg) {
				if (arg.properties) {
					arg.properties = transformProperties(arg.properties);
				}
			});

			if (!block.signatures && block["arguments"].length) {
				block.signature = processSignature(block["arguments"]);
			}
		},

		method: function (meta, block) {
			var Class = getCurrentClass(meta);

			if (!block.signatures && block["arguments"] && block["arguments"].length) {
				block.signature = processSignature(block["arguments"]);

			} else if (!block["arguments"]) {
				block["arguments"] = [];
			}

			if (type.is("string", block.returns)) {
				block.returns = {
					type: block.returns
				};
			}

			if (Class) {
				block.type = "method";
				
				if (block["static"]) {
					Class.staticMethods.push(block);
				} else {
					Class.methods.push(block);
				}

			} else {
				block.type = "function";
				meta.functions.push(block);
			}
		},

		"event": function (meta, block) {
			var Class = getCurrentClass(meta);

			block.type = "event";
			Class.events.push(block);
		},

		"function": function (meta, block) {
			block.type = "function";
			meta.functions.push(block);

			if (!block.signatures && block["arguments"] && block["arguments"].length) {
				block.signature = processSignature(block["arguments"]);
			
			} else if (!block["arguments"]) {
				block["arguments"] = [];
			}

			if (type.is("string", block.returns)) {
				block.returns = {
					type: block.returns
				};
			}
		},

		"object": function (meta, block) {
			block.type = "object";
			meta.objects.push(block);
		},

		"other": function (meta, block) {
			meta.others.push(block);
		}
	};

function getCurrentClass (meta) {
	return arrayLast(meta.classes);
}

function transformProperties (properties) {
	Object.forEach(function (property, name) {

		if (type.is("string", property)) {
			properties[name] = {
				type: property
			};
			property = properties[name];
		}

		if (type.is("undefined", property.required)) {
			property.required = true;
		}
	});
}

function process (meta) {
	var module = {
		type: "module",
		classes: [],
		functions: [],
		objects: [],
		others: []
	};

	return meta.reduce(foldMeta, module);
}

function foldMeta (meta, block) {
	var type = getType(block),
		processor = processors[type];

	if (!processor) {
		processor = processors.other;
	}

	processor(meta, block);

	return meta;
}

function processSignature (argsMeta) {
	var signature = signatures.getSignatureFromMeta(argsMeta).split(",");

	argsMeta.forEach(function (arg, index) {
		arg.signatureComponent = signature[index];
	});
}

function getType (meta) {
	var type = meta.type;

	if (!type) {
		type = deduceType(meta);
	}

	return type;
}

function deduceType (meta) {
	var type;

	if (meta["extends"] || meta.mixins) {
		type = "class";

	} else if (meta["arguments"]) {
		type = "method";

	} else if (meta.before || meta.when || meta.after || meta.params) {
		type = "event";

	} else if (meta.returns) {
		type = "function";

	} else if (meta.properties) {
		type = "object";

	} else {
		type = "other";
	}

	return type;
}

function arrayLast (array) {
	return array[array.length - 1];
}
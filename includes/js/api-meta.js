$(function () {
	$(".api-module-links").on("click", "li", function (event) {
		if ($(event.target).is(":not([href])")) {
			$(this).toggleClass("active");
		}
	});
});
var gulp = require("gulp");
var serve = require("gulp-serve");

gulp.task('default', serve({
	port: 4000,
	root: ['dist']
}));
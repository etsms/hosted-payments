var gulp = require('gulp');
var serve = require('gulp-serve');
var babel = require('gulp-babel');
 

gulp.task('default', serve({
	port: 4000,
	root: ['dist']
}));

gulp.task('build', () =>
    gulp.src('dist/*.js')
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(gulp.dest('dist'))
);
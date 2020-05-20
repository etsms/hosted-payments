var gulp = require("gulp");
var serve = require("gulp-serve");
var babel = require("gulp-babel");
var beautify = require("gulp-jsbeautifier");

gulp.task(
  "default",
  serve({
    port: 4000,
    root: ["dist"]
  })
);

gulp.task("build", () =>
  gulp
    .src("dist/*.js")
    // .pipe(
    //   babel({
    //     presets: [
    //       [
    //         "@babel/env",
    //         {
    //           useBuiltIns: "entry",
    //           corejs: {
    //             version: 3
    //           },
    //           exclude: ['transform-typeof-symbol']
    //         }
    //       ]
    //     ]
    //   })
    // )
    .pipe(beautify.validate())
    .pipe(
      beautify({
        js: {
          wrap_line_length: 10000
        }
      })
    )
    .pipe(beautify.reporter())
    .pipe(gulp.dest("dist"))
);

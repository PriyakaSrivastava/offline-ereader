'use strict';

import connect from 'connect';
import del from 'del';
import ghPages from 'gh-pages';
import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import path from 'path';
import serveStatic from 'serve-static';
import swPrecache from 'sw-precache';
import {exec} from 'child_process';

const $ = gulpLoadPlugins();

const SRC_DIR = 'src';
const DEV_DIR = 'dev';
const JS_FILES_GLOB = `${SRC_DIR}/js/**/*.js`;
const SRC_FILES_GLOBS = [`${SRC_DIR}/!(js)/**/*`, `${SRC_DIR}/*.*`];

gulp.task('babel', () => {
  return gulp.src(JS_FILES_GLOB)
    .pipe($.babel())
    .pipe(gulp.dest(`${DEV_DIR}/js`));
});

gulp.task('bower', callback => {
  exec('bower install', callback);
});

gulp.task('build', ['bower', 'babel', 'copy-src-files', 'generate-service-worker']);

gulp.task('clean', callback => {
  del([DEV_DIR], callback);
});

gulp.task('copy-src-files', () => {
  return gulp.src(SRC_FILES_GLOBS)
    .pipe(gulp.dest(DEV_DIR));
});

gulp.task('gh-pages', ['build'], callback => {
  ghPages.publish(path.join(__dirname, DEV_DIR), callback);
});

gulp.task('serve:dev', ['watch'], callback => {
  connect().use(serveStatic(DEV_DIR)).listen(8080, error => {
    if (error) {
      callback(error);
    }
  });
});

gulp.task('watch', ['build'], () => {
  gulp.watch('bower.json', ['bower']);
  gulp.watch(JS_FILES_GLOB, ['babel']);
  gulp.watch(SRC_FILES_GLOBS, ['copy-src-files']);
});

gulp.task('lint', () => {
  return gulp.src(JS_FILES_GLOB)
    .pipe($.eslint())
    .pipe($.eslint.format())
    .pipe($.eslint.failOnError());
});

gulp.task('generate-service-worker', () => {
  let serviceWorkerFile = path.join(DEV_DIR, 'service-worker.js');

  return swPrecache.write(serviceWorkerFile, {
    staticFileGlobs: [`${DEV_DIR}/**/*.{html,js,css,png,jpg}`],
    runtimeCaching: [{
      urlPattern: /fonts\.gstatic\.com/,
      handler: 'cacheFirst'
    }, {
      urlPattern: /Gitenberg%20Book%20List\.csv/,
      handler: 'fastest'
    }, {
      urlPattern: /^https:\/\/cdn\.rawgit\.com/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'book-cache',
          maxEntries: 10
        }
      }
    }, {
      urlPattern: /imgeng\.in/,
      handler: 'cacheFirst',
      options: {
        cache: {
          name: 'book-cover-cache',
          maxEntries: 50
        }
      }
    }],
    cacheId: 'offline-ereader',
    stripPrefix: `${DEV_DIR}/`,
    ignoreUrlParametersMatching: [/./]
  });
});

gulp.task('default', ['serve:dev']);
'use strict';

const postcssImport = require('postcss-import');
const postcssUrl = require('postcss-url');
const cssnext = require('postcss-cssnext');
const reporter = require('postcss-reporter');
const path = require('path');

module.exports = {
  pug: {
    basedir: path.resolve(__dirname, 'src'),
  },
  postcss: [
    postcssImport,
    postcssUrl({
      url: 'inline',
      maxSize: Infinity,
    }),
    cssnext,
    reporter,
  ],
  // cssnext: {
  //   url: {
  //     url: 'inline',
  //     maxSize: Infinity,
  //     basePath: path.resolve(__dirname)
  //   },
  //   compress: true,
  //   warnForDuplicates: false
  // }
};

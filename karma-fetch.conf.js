// Note some browser launchers should be installed before using karma start.
// For example:
// npm install karma-firefox-launcher
// karma start --browsers=Firefox

var babel = require('rollup-plugin-babel');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['mocha', 'sinon-chai'],
    plugins: ['karma-mocha', 'karma-sinon-chai', 'karma-babel-preprocessor', 'karma-rollup-preprocessor', 'karma-chrome-launcher'],

    // list of files / patterns to load in the browser
    files: [
      'test/vendor/jquery.js',
      'test/vendor/underscore.js',
      'test/fetch/*.js'
    ],

    preprocessors: {
      'test/fetch/*.js': ['rollup']
    },

    rollupPreprocessor: {
      /**
			 * This is just a normal Rollup config object,
			 * except that `input` is handled for you.
			 */
      plugins: [babel({

      })],

      output: {
        format: 'iife',            // Helps prevent naming collisions.
        name: 'nextboneTests',    // Required for 'iife' format.
        sourcemap: 'inline'        // Sensible for testing.
      }
    },

    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],

    // web server port
    port: 9877,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    customLaunchers: {
      ChromeDebugging: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9333']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });
};

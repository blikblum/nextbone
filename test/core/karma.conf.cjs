// Note some browser launchers should be installed before using karma start.
// For example:
// npm install karma-firefox-launcher
// karma start --browsers=Firefox

const babel = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');

const isDebug = process.argv.includes('--debug');

module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['qunit'],
    plugins: ['karma-qunit', 'karma-rollup-preprocessor', 'karma-chrome-launcher'],

    // list of files / patterns to load in the browser
    files: [
      '../../node_modules/jquery/dist/jquery.js',
      'setup.js',
      '*.js'
    ],

    preprocessors: {
      'setup.js': ['rollup'],
      '*.js': ['rollup']
    },

    rollupPreprocessor: {
      /**
       * This is just a normal Rollup config object,
       * except that `input` is handled for you.
       */
      plugins: [
        babel({
          exclude: ['node_modules/**']
        }),
        nodeResolve({})
      ],

      output: {
        format: 'iife', // Helps prevent naming collisions.
        name: 'nextboneTests', // Required for 'iife' format.
        sourcemap: 'inline' // Sensible for testing.

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
    browsers: [isDebug ? 'ChromeDebugging' : 'ChromeHeadless'],

    customLaunchers: {
      ChromeDebugging: {
        base: 'Chrome',
        flags: ['--remote-debugging-port=9333']
      }
    },

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: !isDebug
  });
};

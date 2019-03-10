import * as Backbone from '../../nextbone';

window.Backbone = Backbone;

(function(QUnit) {
  var sync = Backbone.sync.handler;
  var ajax = Backbone.ajax.handler;
  var history = window.history;
  var pushState = history.pushState;
  var replaceState = history.replaceState;

  QUnit.config.noglobals = true;

  QUnit.testStart(function() {
    var env = QUnit.config.current.testEnvironment;

    // We never want to actually call these during tests.
    history.pushState = history.replaceState = function() {};

    // Capture ajax settings for comparison.
    Backbone.ajax.handler = function(settings) {
      env.ajaxSettings = settings;
    };

    // Capture the arguments to Backbone.sync for comparison.
    Backbone.sync.handler = function(method, model, options) {
      env.syncArgs = {
        method: method,
        model: model,
        options: options
      };
      sync.apply(this, arguments);
    };
  });

  QUnit.testDone(function() {
    Backbone.sync.handler = sync;
    Backbone.ajax.handler = ajax;
    history.pushState = pushState;
    history.replaceState = replaceState;
  });
})(QUnit);

(function(QUnit) {

  var router = null;
  var location = null;
  var lastRoute = null;
  var lastArgs = [];

  var onRoute = function(routerParam, route, args) {
    lastRoute = route;
    lastArgs = args;
  };

  var Location = function(href) {
    this.replace(href);
  };

  _.extend(Location.prototype, {

    parser: document.createElement('a'),

    replace: function(href) {
      this.parser.href = href;
      _.extend(this, _.pick(this.parser,
        'href',
        'hash',
        'host',
        'search',
        'fragment',
        'pathname',
        'protocol'
      ));

      // In IE, anchor.pathname does not contain a leading slash though
      // window.location.pathname does.
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    },

    toString: function() {
      return this.href;
    }

  });

  QUnit.module('Backbone.Router', {

    beforeEach: function() {
      location = new Location('http://example.com');
      Backbone.History.instance = _.extend(new Backbone.History, {location: location});
      router = new Router({testing: 101});
      Backbone.History.instance.interval = 9;
      Backbone.History.instance.start({pushState: false});
      lastRoute = null;
      lastArgs = [];
      Backbone.History.instance.on('route', onRoute);
    },

    afterEach: function() {
      Backbone.History.instance.stop();
      Backbone.History.instance.off('route', onRoute);
    }

  });

  var ExternalObject = {
    value: 'unset',

    routingFunction: function(value) {
      this.value = value;
    }
  };
  ExternalObject.routingFunction = _.bind(ExternalObject.routingFunction, ExternalObject);

  var Router = class extends Backbone.Router {
    count = 0;

    static routes = {
      'noCallback': 'noCallback',
      'counter': 'counter',
      'search/:query': 'search',
      'search/:query/p:page': 'search',
      'charñ': 'charUTF',
      'char%C3%B1': 'charEscaped',
      'contacts': 'contacts',
      'contacts/new': 'newContact',
      'contacts/:id': 'loadContact',
      'route-event/:arg': 'routeEvent',
      'optional(/:item)': 'optionalItem',
      'named/optional/(y:z)': 'namedOptional',
      'splat/*args/end': 'splat',
      ':repo/compare/*from...*to': 'github',
      'decode/:named/*splat': 'decode',
      '*first/complex-*part/*rest': 'complex',
      'query/:entity': 'query',
      'function/:value': ExternalObject.routingFunction,
      '*anything': 'anything'
    }

    preinitialize(options) {
      this.testpreinit = 'foo';
    }

    initialize(options) {
      this.testing = options.testing;
      this.route('implicit', 'implicit');
    }

    counter() {
      this.count++;
    }

    implicit() {
      this.count++;
    }

    search(query, page) {
      this.query = query;
      this.page = page;
    }

    charUTF() {
      this.charType = 'UTF';
    }

    charEscaped() {
      this.charType = 'escaped';
    }

    contacts() {
      this.contact = 'index';
    }

    newContact() {
      this.contact = 'new';
    }

    loadContact() {
      this.contact = 'load';
    }

    optionalItem(arg) {
      this.arg = arg !== void 0 ? arg : null;
    }

    splat(args) {
      this.args = args;
    }

    github(repo, from, to) {
      this.repo = repo;
      this.from = from;
      this.to = to;
    }

    complex(first, part, rest) {
      this.first = first;
      this.part = part;
      this.rest = rest;
    }

    query(entity, args) {
      this.entity    = entity;
      this.queryArgs = args;
    }

    anything(whatever) {
      this.anything = whatever;
    }

    namedOptional(z) {
      this.z = z;
    }

    decode(named, path) {
      this.named = named;
      this.path = path;
    }

    routeEvent(arg) {
    }

  };

  QUnit.test('initialize', function(assert) {
    assert.expect(1);
    assert.equal(router.testing, 101);
  });

  QUnit.test('preinitialize', function(assert) {
    assert.expect(1);
    assert.equal(router.testpreinit, 'foo');
  });

  QUnit.test('routes (simple)', function(assert) {
    assert.expect(4);
    location.replace('http://example.com#search/news');
    Backbone.History.instance.checkUrl();
    assert.equal(router.query, 'news');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
    assert.equal(lastArgs[0], 'news');
  });

  QUnit.test('routes (simple, but unicode)', function(assert) {
    assert.expect(4);
    location.replace('http://example.com#search/тест');
    Backbone.History.instance.checkUrl();
    assert.equal(router.query, 'тест');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
    assert.equal(lastArgs[0], 'тест');
  });

  QUnit.test('routes (two part)', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#search/nyc/p10');
    Backbone.History.instance.checkUrl();
    assert.equal(router.query, 'nyc');
    assert.equal(router.page, '10');
  });

  QUnit.test('routes via navigate', function(assert) {
    assert.expect(2);
    Backbone.History.instance.navigate('search/manhattan/p20', {trigger: true});
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  QUnit.test('routes via navigate with params', function(assert) {
    assert.expect(1);
    Backbone.History.instance.navigate('query/test?a=b', {trigger: true});
    assert.equal(router.queryArgs, 'a=b');
  });

  QUnit.test('routes via navigate for backwards-compatibility', function(assert) {
    assert.expect(2);
    Backbone.History.instance.navigate('search/manhattan/p20', true);
    assert.equal(router.query, 'manhattan');
    assert.equal(router.page, '20');
  });

  QUnit.test('reports matched route via nagivate', function(assert) {
    assert.expect(1);
    assert.ok(Backbone.History.instance.navigate('search/manhattan/p20', true));
  });

  QUnit.test('route precedence via navigate', function(assert) {
    assert.expect(6);

    // Check both 0.9.x and backwards-compatibility options
    _.each([{trigger: true}, true], function(options) {
      Backbone.History.instance.navigate('contacts', options);
      assert.equal(router.contact, 'index');
      Backbone.History.instance.navigate('contacts/new', options);
      assert.equal(router.contact, 'new');
      Backbone.History.instance.navigate('contacts/foo', options);
      assert.equal(router.contact, 'load');
    });
  });

  QUnit.test('loadUrl is not called for identical routes.', function(assert) {
    assert.expect(0);
    Backbone.History.instance.loadUrl = function() { assert.ok(false); };
    location.replace('http://example.com#route');
    Backbone.History.instance.navigate('route');
    Backbone.History.instance.navigate('/route');
    Backbone.History.instance.navigate('/route');
  });

  QUnit.test('use implicit callback if none provided', function(assert) {
    assert.expect(1);
    router.count = 0;
    router.navigate('implicit', {trigger: true});
    assert.equal(router.count, 1);
  });

  QUnit.test('routes via navigate with {replace: true}', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#start_here');
    Backbone.History.instance.checkUrl();
    location.replace = function(href) {
      assert.strictEqual(href, new Location('http://example.com#end_here').href);
    };
    Backbone.History.instance.navigate('end_here', {replace: true});
  });

  QUnit.test('routes (splats)', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Backbone.History.instance.checkUrl();
    assert.equal(router.args, 'long-list/of/splatted_99args');
  });

  QUnit.test('routes (github)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#backbone/compare/1.0...braddunbar:with/slash');
    Backbone.History.instance.checkUrl();
    assert.equal(router.repo, 'backbone');
    assert.equal(router.from, '1.0');
    assert.equal(router.to, 'braddunbar:with/slash');
  });

  QUnit.test('routes (optional)', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#optional');
    Backbone.History.instance.checkUrl();
    assert.ok(!router.arg);
    location.replace('http://example.com#optional/thing');
    Backbone.History.instance.checkUrl();
    assert.equal(router.arg, 'thing');
  });

  QUnit.test('routes (complex)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Backbone.History.instance.checkUrl();
    assert.equal(router.first, 'one/two/three');
    assert.equal(router.part, 'part');
    assert.equal(router.rest, 'four/five/six/seven');
  });

  QUnit.test('routes (query)', function(assert) {
    assert.expect(5);
    location.replace('http://example.com#query/mandel?a=b&c=d');
    Backbone.History.instance.checkUrl();
    assert.equal(router.entity, 'mandel');
    assert.equal(router.queryArgs, 'a=b&c=d');
    assert.equal(lastRoute, 'query');
    assert.equal(lastArgs[0], 'mandel');
    assert.equal(lastArgs[1], 'a=b&c=d');
  });

  QUnit.test('routes (anything)', function(assert) {
    assert.expect(1);
    location.replace('http://example.com#doesnt-match-a-route');
    Backbone.History.instance.checkUrl();
    assert.equal(router.anything, 'doesnt-match-a-route');
  });

  QUnit.test('routes (function)', function(assert) {
    assert.expect(3);
    router.on('route', function(name) {
      assert.ok(name === '');
    });
    assert.equal(ExternalObject.value, 'unset');
    location.replace('http://example.com#function/set');
    Backbone.History.instance.checkUrl();
    assert.equal(ExternalObject.value, 'set');
  });

  QUnit.test('Decode named parameters, not splats.', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
    Backbone.History.instance.checkUrl();
    assert.strictEqual(router.named, 'a/b');
    assert.strictEqual(router.path, 'c/d/e');
  });

  QUnit.test('fires event when router doesn\'t have callback on it', function(assert) {
    assert.expect(1);
    router.on('route:noCallback', function() { assert.ok(true); });
    location.replace('http://example.com#noCallback');
    Backbone.History.instance.checkUrl();
  });

  QUnit.test('No events are triggered if #execute returns false.', function(assert) {
    assert.expect(1);
    var MyRouter = class extends Backbone.Router {

      static routes = {
        foo: function() {
          assert.ok(true);
        }
      }

      execute(callback, args) {
        callback.apply(this, args);
        return false;
      }

    };

    var myRouter = new MyRouter;

    myRouter.on('route route:foo', function() {
      assert.ok(false);
    });

    Backbone.History.instance.on('route', function() {
      assert.ok(false);
    });

    location.replace('http://example.com#foo');
    Backbone.History.instance.checkUrl();
  });

  QUnit.test('#933, #908 - leading slash', function(assert) {
    assert.expect(2);
    location.replace('http://example.com/root/foo');

    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({root: '/root', hashChange: false, silent: true});
    assert.strictEqual(Backbone.History.instance.getFragment(), 'foo');

    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({root: '/root/', hashChange: false, silent: true});
    assert.strictEqual(Backbone.History.instance.getFragment(), 'foo');
  });

  QUnit.test('#967 - Route callback gets passed encoded values.', function(assert) {
    assert.expect(3);
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Backbone.History.instance.navigate(route, {trigger: true});
    assert.strictEqual(router.first, 'has/slash');
    assert.strictEqual(router.part, 'has#hash');
    assert.strictEqual(router.rest, 'has space');
  });

  QUnit.test('correctly handles URLs with % (#868)', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#search/fat%3A1.5%25');
    Backbone.History.instance.checkUrl();
    location.replace('http://example.com#search/fat');
    Backbone.History.instance.checkUrl();
    assert.equal(router.query, 'fat');
    assert.equal(router.page, void 0);
    assert.equal(lastRoute, 'search');
  });

  QUnit.test('#2666 - Hashes with UTF8 in them.', function(assert) {
    assert.expect(2);
    Backbone.History.instance.navigate('charñ', {trigger: true});
    assert.equal(router.charType, 'UTF');
    Backbone.History.instance.navigate('char%C3%B1', {trigger: true});
    assert.equal(router.charType, 'UTF');
  });

  QUnit.test('#1185 - Use pathname when hashChange is not wanted.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/path/name#hash');
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({hashChange: false});
    var fragment = Backbone.History.instance.getFragment();
    assert.strictEqual(fragment, location.pathname.replace(/^\//, ''));
  });

  QUnit.test('#1206 - Strip leading slash before location.assign.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root/');
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({hashChange: false, root: '/root/'});
    location.assign = function(pathname) {
      assert.strictEqual(pathname, '/root/fragment');
    };
    Backbone.History.instance.navigate('/fragment');
  });

  QUnit.test('#1387 - Root fragment without trailing slash.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({hashChange: false, root: '/root/', silent: true});
    assert.strictEqual(Backbone.History.instance.getFragment(), '');
  });

  QUnit.test('#1366 - History does not prepend root to fragment.', function(assert) {
    assert.expect(2);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root/');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root/x');
        }
      }
    });
    Backbone.History.instance.start({
      root: '/root/',
      pushState: true,
      hashChange: false
    });
    Backbone.History.instance.navigate('x');
    assert.strictEqual(Backbone.History.instance.fragment, 'x');
  });

  QUnit.test('Normalize root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.History.instance.start({
      pushState: true,
      root: '/root',
      hashChange: false
    });
    Backbone.History.instance.navigate('fragment');
  });

  QUnit.test('Normalize root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#fragment');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/fragment');
        }
      }
    });
    Backbone.History.instance.start({
      pushState: true,
      root: '/root'
    });
  });

  QUnit.test('Normalize root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.loadUrl = function() { assert.ok(true); };
    Backbone.History.instance.start({
      pushState: true,
      root: '/root'
    });
  });

  QUnit.test('Normalize root - leading slash.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Backbone.History.instance.start({root: 'root'});
    assert.strictEqual(Backbone.History.instance.root, '/root/');
  });

  QUnit.test('Transition from hashChange to pushState.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#x/y');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/x/y');
        }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true
    });
  });

  QUnit.test('#1619: Router: Normalize empty root', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Backbone.History.instance.start({root: ''});
    assert.strictEqual(Backbone.History.instance.root, '/');
  });

  QUnit.test('#1619: Router: nagivate with empty root', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/fragment');
        }
      }
    });
    Backbone.History.instance.start({
      pushState: true,
      root: '',
      hashChange: false
    });
    Backbone.History.instance.navigate('fragment');
  });


  QUnit.test('#1695 - hashChange to pushState with search.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#x/y?a=b');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          assert.strictEqual(url, '/root/x/y?a=b');
        }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true
    });
  });

  QUnit.test('#1746 - Router allows empty route.', function(assert) {
    assert.expect(1);
    var MyRouter = class extends Backbone.Router {
      static routes = {'': 'empty'}
      empty() {}
      route(route) {
        assert.strictEqual(route, '');
      }
    };
    new MyRouter;
  });

  QUnit.test('#1794 - Trailing space in fragments.', function(assert) {
    assert.expect(1);
    var history = new Backbone.History;
    assert.strictEqual(history.getFragment('fragment   '), 'fragment');
  });

  QUnit.test('#1820 - Leading slash and trailing space.', function(assert) {
    assert.expect(1);
    var history = new Backbone.History;
    assert.strictEqual(history.getFragment('/fragment '), 'fragment');
  });

  QUnit.test('#1980 - Optional parameters.', function(assert) {
    assert.expect(2);
    location.replace('http://example.com#named/optional/y');
    Backbone.History.instance.checkUrl();
    assert.strictEqual(router.z, undefined);
    location.replace('http://example.com#named/optional/y123');
    Backbone.History.instance.checkUrl();
    assert.strictEqual(router.z, '123');
  });

  QUnit.test('#2062 - Trigger "route" event on router instance.', function(assert) {
    assert.expect(2);
    router.on('route', function(name, args) {
      assert.strictEqual(name, 'routeEvent');
      assert.deepEqual(args, ['x', null]);
    });
    location.replace('http://example.com#route-event/x');
    Backbone.History.instance.checkUrl();
  });

  QUnit.test('#2255 - Extend routes by making routes a function.', function(assert) {
    assert.expect(1);
    var RouterBase = class extends Backbone.Router {
      routes() {
        return {
          home: 'root',
          index: 'index.html'
        };
      }
    };

    var RouterExtended = class extends RouterBase {
      routes() {
        return _.extend(super.routes(), {show: 'show', search: 'search'});
      }
    };

    var myRouter = new RouterExtended();
    assert.deepEqual({home: 'root', index: 'index.html', show: 'show', search: 'search'}, myRouter.routes);
  });

  QUnit.test('#2538 - hashChange to pushState only if both requested.', function(assert) {
    assert.expect(0);
    Backbone.History.instance.stop();
    location.replace('http://example.com/root?a=b#x/y');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() { assert.ok(false); }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true,
      hashChange: false
    });
  });

  QUnit.test('No hash fallback.', function(assert) {
    assert.expect(0);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });

    var MyRouter = class extends Backbone.Router {
      static routes = {
        hash: function() { assert.ok(false); }
      }
    };
    var myRouter = new MyRouter;

    location.replace('http://example.com/');
    Backbone.History.instance.start({
      pushState: true,
      hashChange: false
    });
    location.replace('http://example.com/nomatch#hash');
    Backbone.History.instance.checkUrl();
  });

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Backbone.History.instance.start({pushState: true, hashChange: false, root: 'root'});
    Backbone.History.instance.navigate('');
  });

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/');
        }
      }
    });
    location.replace('http://example.com/path');
    Backbone.History.instance.start({pushState: true, hashChange: false});
    Backbone.History.instance.navigate('');
  });

  QUnit.test('#2656 - No trailing slash on root.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/root?x=1');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Backbone.History.instance.start({pushState: true, hashChange: false, root: 'root'});
    Backbone.History.instance.navigate('?x=1');
  });

  QUnit.test('#2765 - Fragment matching sans query/hash.', function(assert) {
    assert.expect(2);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function(state, title, url) {
          assert.strictEqual(url, '/path?query#hash');
        }
      }
    });

    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function() { assert.ok(true); }
      }
    };
    var myRouter = new MyRouter;

    location.replace('http://example.com/');
    Backbone.History.instance.start({pushState: true, hashChange: false});
    Backbone.History.instance.navigate('path?query#hash', true);
  });

  QUnit.test('Do not decode the search params.', function(assert) {
    assert.expect(1);
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          assert.strictEqual(params, 'x=y%3Fz');
        }
      }
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.navigate('path?x=y%3Fz', true);
  });

  QUnit.test('Navigate to a hash url.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({pushState: true});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          assert.strictEqual(params, 'x=y');
        }
      }
    };
    var myRouter = new MyRouter;
    location.replace('http://example.com/path?x=y#hash');
    Backbone.History.instance.checkUrl();
  });

  QUnit.test('#navigate to a hash url.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    Backbone.History.instance.start({pushState: true});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          assert.strictEqual(params, 'x=y');
        }
      }
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.navigate('path?x=y#hash', true);
  });

  QUnit.test('unicode pathname', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/myyjä');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        myyjä: function() {
          assert.ok(true);
        }
      }
    };
    new MyRouter;
    Backbone.History.instance.start({pushState: true});
  });

  QUnit.test('unicode pathname with % in a parameter', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/myyjä/foo%20%25%3F%2f%40%25%20bar');
    location.pathname = '/myyj%C3%A4/foo%20%25%3F%2f%40%25%20bar';
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        'myyjä/:query': function(query) {
          assert.strictEqual(query, 'foo %?/@% bar');
        }
      }
    };
    new MyRouter;
    Backbone.History.instance.start({pushState: true});
  });

  QUnit.test('newline in route', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        'stuff\nnonsense': function() {
          assert.ok(true);
        }
      }
    };
    new MyRouter;
    Backbone.History.instance.start({pushState: true});
  });

  QUnit.test('Router#execute receives callback, args, name.', function(assert) {
    assert.expect(3);
    location.replace('http://example.com#foo/123/bar?x=y');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {'foo/:id/bar': 'foo'}
      foo() {}
      execute(callback, args, name) {
        assert.strictEqual(callback, this.foo);
        assert.deepEqual(args, ['123', 'x=y']);
        assert.strictEqual(name, 'foo');
      }
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start();
  });


  QUnit.test('#3123 - History#navigate decodes before comparison.', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com/shop/search?keyword=short%20dress');
    Backbone.History.instance = _.extend(new Backbone.History, {
      location: location,
      history: {
        pushState: function() { assert.ok(false); },
        replaceState: function() { assert.ok(false); }
      }
    });
    Backbone.History.instance.start({pushState: true});
    Backbone.History.instance.navigate('shop/search?keyword=short%20dress', true);
    assert.strictEqual(Backbone.History.instance.fragment, 'shop/search?keyword=short dress');
  });

  QUnit.test('#3175 - Urls in the params', function(assert) {
    assert.expect(1);
    Backbone.History.instance.stop();
    location.replace('http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var myRouter = new Backbone.Router;
    myRouter.route('login', function(params) {
      assert.strictEqual(params, 'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db');
    });
    Backbone.History.instance.start();
  });

  QUnit.test('Paths that don\'t match the root should not match no root', function(assert) {
    assert.expect(0);
    location.replace('http://example.com/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          assert.ok(false, 'should not match unless root matches');
        }
      }
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start({root: 'root', pushState: true});
  });

  QUnit.test('Paths that don\'t match the root should not match roots of the same length', function(assert) {
    assert.expect(0);
    location.replace('http://example.com/xxxx/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          assert.ok(false, 'should not match unless root matches');
        }
      }
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start({root: 'root', pushState: true});
  });

  QUnit.test('roots with regex characters', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/x+y.z/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {foo: function() { assert.ok(true); }}
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start({root: 'x+y.z', pushState: true});
  });

  QUnit.test('roots with unicode characters', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/®ooτ/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {foo: function() { assert.ok(true); }}
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start({root: '®ooτ', pushState: true});
  });

  QUnit.test('roots without slash', function(assert) {
    assert.expect(1);
    location.replace('http://example.com/®ooτ');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History, {location: location});
    var MyRouter = class extends Backbone.Router {
      static routes = {'': function() { assert.ok(true); }}
    };
    var myRouter = new MyRouter;
    Backbone.History.instance.start({root: '®ooτ', pushState: true});
  });

  QUnit.test('#4025 - navigate updates URL hash as is', function(assert) {
    assert.expect(1);
    var route = 'search/has%20space';
    Backbone.History.instance.navigate(route);
    assert.strictEqual(location.hash, '#' + route);
  });

})(QUnit);

import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';
import { chaiAsPromised } from 'chai-promised';

import 'chai/chai.js';

const { expect } = window.chai;
window.chai.use(chaiAsPromised);

describe('Backbone.Router', function() {
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
      _.extend(
        this,
        _.pick(this.parser, 'href', 'hash', 'host', 'search', 'fragment', 'pathname', 'protocol')
      );

      // In IE, anchor.pathname does not contain a leading slash though
      // window.location.pathname does.
      if (!/^\//.test(this.pathname)) this.pathname = '/' + this.pathname;
    },

    toString: function() {
      return this.href;
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
      noCallback: 'noCallback',
      counter: 'counter',
      'search/:query': 'search',
      'search/:query/p:page': 'search',
      charñ: 'charUTF',
      'char%C3%B1': 'charEscaped',
      contacts: 'contacts',
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
    };

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
      this.entity = entity;
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

    routeEvent(arg) {}
  };

  beforeEach(function() {
    location = new Location('http://example.com');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    router = new Router({ testing: 101 });
    Backbone.History.instance.interval = 9;
    Backbone.History.instance.start({ pushState: false });
    lastRoute = null;
    lastArgs = [];
    Backbone.History.instance.on('route', onRoute);
  });

  afterEach(function() {
    Backbone.History.instance.stop();
    Backbone.History.instance.off('route', onRoute);
  });

  it('initialize', function() {
    expect(router.testing).to.equal(101);
  });

  it('preinitialize', function() {
    expect(router.testpreinit).to.equal('foo');
  });

  it('routes (simple)', function() {
    location.replace('http://example.com#search/news');
    Backbone.History.instance.checkUrl();
    expect(router.query).to.equal('news');
    expect(router.page).to.equal(null);
    expect(lastRoute).to.equal('search');
    expect(lastArgs[0]).to.equal('news');
  });

  it('routes (simple, but unicode)', function() {
    location.replace('http://example.com#search/тест');
    Backbone.History.instance.checkUrl();
    expect(router.query).to.equal('тест');
    expect(router.page).to.equal(null);
    expect(lastRoute).to.equal('search');
    expect(lastArgs[0]).to.equal('тест');
  });

  it('routes (two part)', function() {
    location.replace('http://example.com#search/nyc/p10');
    Backbone.History.instance.checkUrl();
    expect(router.query).to.equal('nyc');
    expect(router.page).to.equal('10');
  });

  it('routes via navigate', function() {
    Backbone.History.instance.navigate('search/manhattan/p20', {
      trigger: true
    });
    expect(router.query).to.equal('manhattan');
    expect(router.page).to.equal('20');
  });

  it('routes via navigate with params', function() {
    Backbone.History.instance.navigate('query/test?a=b', { trigger: true });
    expect(router.queryArgs).to.equal('a=b');
  });

  it('routes via navigate for backwards-compatibility', function() {
    Backbone.History.instance.navigate('search/manhattan/p20', true);
    expect(router.query).to.equal('manhattan');
    expect(router.page).to.equal('20');
  });

  it('reports matched route via nagivate', function() {
    expect(Backbone.History.instance.navigate('search/manhattan/p20', true)).to.be.ok;
  });

  it('route precedence via navigate', function() {
    _.each([{ trigger: true }, true], function(options) {
      Backbone.History.instance.navigate('contacts', options);
      expect(router.contact).to.equal('index');
      Backbone.History.instance.navigate('contacts/new', options);
      expect(router.contact).to.equal('new');
      Backbone.History.instance.navigate('contacts/foo', options);
      expect(router.contact).to.equal('load');
    });
  });

  it('loadUrl is not called for identical routes.', function() {
    Backbone.History.instance.loadUrl = function() {
      expect.fail('loadUrl should not be called');
    };
    location.replace('http://example.com#route');
    Backbone.History.instance.navigate('route');
    Backbone.History.instance.navigate('/route');
    Backbone.History.instance.navigate('/route');
  });

  it('use implicit callback if none provided', function() {
    router.count = 0;
    router.navigate('implicit', { trigger: true });
    expect(router.count).to.equal(1);
  });

  it('routes via navigate with {replace: true}', function() {
    location.replace('http://example.com#start_here');
    Backbone.History.instance.checkUrl();
    location.replace = function(href) {
      expect(href).to.eql(new Location('http://example.com#end_here').href);
    };
    Backbone.History.instance.navigate('end_here', { replace: true });
  });

  it('routes (splats)', function() {
    location.replace('http://example.com#splat/long-list/of/splatted_99args/end');
    Backbone.History.instance.checkUrl();
    expect(router.args).to.equal('long-list/of/splatted_99args');
  });

  it('routes (github)', function() {
    location.replace('http://example.com#backbone/compare/1.0...braddunbar:with/slash');
    Backbone.History.instance.checkUrl();
    expect(router.repo).to.equal('backbone');
    expect(router.from).to.equal('1.0');
    expect(router.to).to.equal('braddunbar:with/slash');
  });

  it('routes (optional)', function() {
    location.replace('http://example.com#optional');
    Backbone.History.instance.checkUrl();
    expect(router.arg).to.not.be.ok;
    location.replace('http://example.com#optional/thing');
    Backbone.History.instance.checkUrl();
    expect(router.arg).to.equal('thing');
  });

  it('routes (complex)', function() {
    location.replace('http://example.com#one/two/three/complex-part/four/five/six/seven');
    Backbone.History.instance.checkUrl();
    expect(router.first).to.equal('one/two/three');
    expect(router.part).to.equal('part');
    expect(router.rest).to.equal('four/five/six/seven');
  });

  it('routes (query)', function() {
    location.replace('http://example.com#query/mandel?a=b&c=d');
    Backbone.History.instance.checkUrl();
    expect(router.entity).to.equal('mandel');
    expect(router.queryArgs).to.equal('a=b&c=d');
    expect(lastRoute).to.equal('query');
    expect(lastArgs[0]).to.equal('mandel');
    expect(lastArgs[1]).to.equal('a=b&c=d');
  });

  it('routes (anything)', function() {
    location.replace('http://example.com#doesnt-match-a-route');
    Backbone.History.instance.checkUrl();
    expect(router.anything).to.equal('doesnt-match-a-route');
  });

  it('routes (function)', function() {
    router.on('route', function(name) {
      expect(name).to.equal('');
    });
    expect(ExternalObject.value).to.equal('unset');
    location.replace('http://example.com#function/set');
    Backbone.History.instance.checkUrl();
    expect(ExternalObject.value).to.equal('set');
  });

  it('Decode named parameters, not splats.', function() {
    location.replace('http://example.com#decode/a%2Fb/c%2Fd/e');
    Backbone.History.instance.checkUrl();
    expect(router.named).to.eql('a/b');
    expect(router.path).to.eql('c/d/e');
  });

  it("fires event when router doesn't have callback on it", function() {
    router.on('route:noCallback', function() {
      expect(true).to.be.ok;
    });
    location.replace('http://example.com#noCallback');
    Backbone.History.instance.checkUrl();
  });

  it('No events are triggered if #execute returns false.', function() {
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          expect(true).to.be.ok;
        }
      };

      execute(callback, args) {
        callback.apply(this, args);
        return false;
      }
    };

    var myRouter = new MyRouter();

    myRouter.on('route route:foo', function() {
      expect.fail('No events should trigger');
    });

    Backbone.History.instance.on('route', function() {
      expect.fail('No events should trigger');
    });

    location.replace('http://example.com#foo');
    Backbone.History.instance.checkUrl();
  });

  it('#933, #908 - leading slash', function() {
    location.replace('http://example.com/root/foo');

    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({
      root: '/root',
      hashChange: false,
      silent: true
    });
    expect(Backbone.History.instance.getFragment()).to.eql('foo');

    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({
      root: '/root/',
      hashChange: false,
      silent: true
    });
    expect(Backbone.History.instance.getFragment()).to.eql('foo');
  });

  it('#967 - Route callback gets passed encoded values.', function() {
    var route = 'has%2Fslash/complex-has%23hash/has%20space';
    Backbone.History.instance.navigate(route, { trigger: true });
    expect(router.first).to.eql('has/slash');
    expect(router.part).to.eql('has#hash');
    expect(router.rest).to.eql('has space');
  });

  it('correctly handles URLs with % (#868)', function() {
    location.replace('http://example.com#search/fat%3A1.5%25');
    Backbone.History.instance.checkUrl();
    location.replace('http://example.com#search/fat');
    Backbone.History.instance.checkUrl();
    expect(router.query).to.equal('fat');
    expect(router.page).to.equal(null);
    expect(lastRoute).to.equal('search');
  });

  it('#2666 - Hashes with UTF8 in them.', function() {
    Backbone.History.instance.navigate('charñ', { trigger: true });
    expect(router.charType).to.equal('UTF');
    Backbone.History.instance.navigate('char%C3%B1', { trigger: true });
    expect(router.charType).to.equal('UTF');
  });

  it('#1185 - Use pathname when hashChange is not wanted.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/path/name#hash');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({ hashChange: false });
    var fragment = Backbone.History.instance.getFragment();
    expect(fragment).to.eql(location.pathname.replace(/^\//, ''));
  });

  it('#1206 - Strip leading slash before location.assign.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root/');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({ hashChange: false, root: '/root/' });
    location.assign = function(pathname) {
      expect(pathname).to.eql('/root/fragment');
    };
    Backbone.History.instance.navigate('/fragment');
  });

  it('#1387 - Root fragment without trailing slash.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({
      hashChange: false,
      root: '/root/',
      silent: true
    });
    expect(Backbone.History.instance.getFragment()).to.eql('');
  });

  it('#1366 - History does not prepend root to fragment.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root/');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/root/x');
        }
      }
    });
    Backbone.History.instance.start({
      root: '/root/',
      pushState: true,
      hashChange: false
    });
    Backbone.History.instance.navigate('x');
    expect(Backbone.History.instance.fragment).to.eql('x');
  });

  it('Normalize root.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/root/fragment');
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

  it('Normalize root.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#fragment');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {},
        replaceState: function(state, title, url) {
          expect(url).to.eql('/root/fragment');
        }
      }
    });
    Backbone.History.instance.start({
      pushState: true,
      root: '/root'
    });
  });

  it('Normalize root.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.loadUrl = function() {
      expect(true).to.be.ok;
    };
    Backbone.History.instance.start({
      pushState: true,
      root: '/root'
    });
  });

  it('Normalize root - leading slash.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Backbone.History.instance.start({ root: 'root' });
    expect(Backbone.History.instance.root).to.eql('/root/');
  });

  it('Transition from hashChange to pushState.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#x/y');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          expect(url).to.eql('/root/x/y');
        }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true
    });
  });

  it('#1619: Router: Normalize empty root', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });
    Backbone.History.instance.start({ root: '' });
    expect(Backbone.History.instance.root).to.eql('/');
  });

  it('#1619: Router: nagivate with empty root', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/fragment');
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

  it('#1695 - hashChange to pushState with search.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root#x/y?a=b');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function(state, title, url) {
          expect(url).to.eql('/root/x/y?a=b');
        }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true
    });
  });

  it('#1746 - Router allows empty route.', function() {
    var MyRouter = class extends Backbone.Router {
      static routes = { '': 'empty' };
      empty() {}
      route(route) {
        expect(route).to.eql('');
      }
    };
    new MyRouter();
  });

  it('#1794 - Trailing space in fragments.', function() {
    var history = new Backbone.History();
    expect(history.getFragment('fragment   ')).to.eql('fragment');
  });

  it('#1820 - Leading slash and trailing space.', function() {
    var history = new Backbone.History();
    expect(history.getFragment('/fragment ')).to.eql('fragment');
  });

  it('#1980 - Optional parameters.', function() {
    location.replace('http://example.com#named/optional/y');
    Backbone.History.instance.checkUrl();
    expect(router.z).to.equal(undefined);
    location.replace('http://example.com#named/optional/y123');
    Backbone.History.instance.checkUrl();
    expect(router.z).to.equal('123');
  });

  it('#2062 - Trigger "route" event on router instance.', function() {
    router.on('route', function(name, args) {
      expect(name).to.eql('routeEvent');
      expect(args).to.deep.equal(['x', null]);
    });
    location.replace('http://example.com#route-event/x');
    Backbone.History.instance.checkUrl();
  });

  it('#2255 - Extend routes by making routes a function.', function() {
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
        return _.extend(super.routes(), { show: 'show', search: 'search' });
      }
    };

    var myRouter = new RouterExtended();
    expect({
      home: 'root',
      index: 'index.html',
      show: 'show',
      search: 'search'
    }).to.deep.equal(myRouter.routes);
  });

  it('#2538 - hashChange to pushState only if both requested.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/root?a=b#x/y');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {
          expect.fail('replaceState should not be called');
        }
      }
    });
    Backbone.History.instance.start({
      root: 'root',
      pushState: true,
      hashChange: false
    });
  });

  it('No hash fallback.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {},
        replaceState: function() {}
      }
    });

    var MyRouter = class extends Backbone.Router {
      static routes = {
        hash: function() {
          expect.fail('This should not be called');
        }
      };
    };
    var myRouter = new MyRouter();

    location.replace('http://example.com/');
    Backbone.History.instance.start({
      pushState: true,
      hashChange: false
    });
    location.replace('http://example.com/nomatch#hash');
    Backbone.History.instance.checkUrl();
  });

  it('#2656 - No trailing slash on root.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/root');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Backbone.History.instance.start({
      pushState: true,
      hashChange: false,
      root: 'root'
    });
    Backbone.History.instance.navigate('');
  });

  it('#2656 - No trailing slash on root.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/');
        }
      }
    });
    location.replace('http://example.com/path');
    Backbone.History.instance.start({ pushState: true, hashChange: false });
    Backbone.History.instance.navigate('');
  });

  it('#2656 - No trailing slash on root.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/root?x=1');
        }
      }
    });
    location.replace('http://example.com/root/path');
    Backbone.History.instance.start({
      pushState: true,
      hashChange: false,
      root: 'root'
    });
    Backbone.History.instance.navigate('?x=1');
  });

  it('#2765 - Fragment matching sans query/hash.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function(state, title, url) {
          expect(url).to.eql('/path?query#hash');
        }
      }
    });

    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function() {
          expect(true).to.be.ok;
        }
      };
    };
    var myRouter = new MyRouter();

    location.replace('http://example.com/');
    Backbone.History.instance.start({ pushState: true, hashChange: false });
    Backbone.History.instance.navigate('path?query#hash', true);
  });

  it('Do not decode the search params.', function() {
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          expect(params).to.eql('x=y%3Fz');
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.navigate('path?x=y%3Fz', true);
  });

  it('Navigate to a hash url.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({ pushState: true });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          expect(params).to.eql('x=y');
        }
      };
    };
    var myRouter = new MyRouter();
    location.replace('http://example.com/path?x=y#hash');
    Backbone.History.instance.checkUrl();
  });

  it('#navigate to a hash url.', function() {
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    Backbone.History.instance.start({ pushState: true });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        path: function(params) {
          expect(params).to.eql('x=y');
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.navigate('path?x=y#hash', true);
  });

  it('unicode pathname', function() {
    location.replace('http://example.com/myyjä');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        myyjä: function() {
          expect(true).to.be.ok;
        }
      };
    };
    new MyRouter();
    Backbone.History.instance.start({ pushState: true });
  });

  it('unicode pathname with % in a parameter', function() {
    location.replace('http://example.com/myyjä/foo%20%25%3F%2f%40%25%20bar');
    location.pathname = '/myyj%C3%A4/foo%20%25%3F%2f%40%25%20bar';
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        'myyjä/:query': function(query) {
          expect(query).to.eql('foo %?/@% bar');
        }
      };
    };
    new MyRouter();
    Backbone.History.instance.start({ pushState: true });
  });

  it('newline in route', function() {
    location.replace('http://example.com/stuff%0Anonsense?param=foo%0Abar');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        'stuff\nnonsense': function() {
          expect(true).to.be.ok;
        }
      };
    };
    new MyRouter();
    Backbone.History.instance.start({ pushState: true });
  });

  it('Router#execute receives callback, args, name.', function() {
    location.replace('http://example.com#foo/123/bar?x=y');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = { 'foo/:id/bar': 'foo' };
      foo() {}
      execute(callback, args, name) {
        expect(callback).to.eql(this.foo);
        expect(args).to.deep.equal(['123', 'x=y']);
        expect(name).to.eql('foo');
      }
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start();
  });

  it('#3123 - History#navigate decodes before comparison.', function() {
    Backbone.History.instance.stop();
    location.replace('http://example.com/shop/search?keyword=short%20dress');
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location,
      history: {
        pushState: function() {
          expect.fail('pushState should not be called');
        },
        replaceState: function() {
          expect.fail('replaceState should not be called');
        }
      }
    });
    Backbone.History.instance.start({ pushState: true });
    Backbone.History.instance.navigate('shop/search?keyword=short%20dress', true);
    expect(Backbone.History.instance.fragment).to.eql('shop/search?keyword=short dress');
  });

  it('#3175 - Urls in the params', function() {
    Backbone.History.instance.stop();
    location.replace(
      'http://example.com#login?a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db'
    );
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var myRouter = new Backbone.Router();
    myRouter.route('login', function(params) {
      expect(params).to.eql(
        'a=value&backUrl=https%3A%2F%2Fwww.msn.com%2Fidp%2Fidpdemo%3Fspid%3Dspdemo%26target%3Db'
      );
    });
    Backbone.History.instance.start();
  });

  it("Paths that don't match the root should not match no root", function() {
    location.replace('http://example.com/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          expect.fail('should not match unless root matches');
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start({ root: 'root', pushState: true });
  });

  it("Paths that don't match the root should not match roots of the same length", function() {
    location.replace('http://example.com/xxxx/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          expect.fail('should not match unless root matches');
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start({ root: 'root', pushState: true });
  });

  it('roots with regex characters', function() {
    location.replace('http://example.com/x+y.z/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          expect(true).to.be.ok;
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start({ root: 'x+y.z', pushState: true });
  });

  it('roots with unicode characters', function() {
    location.replace('http://example.com/®ooτ/foo');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        foo: function() {
          expect(true).to.be.ok;
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start({ root: '®ooτ', pushState: true });
  });

  it('roots without slash', function() {
    location.replace('http://example.com/®ooτ');
    Backbone.History.instance.stop();
    Backbone.History.instance = _.extend(new Backbone.History(), {
      location: location
    });
    var MyRouter = class extends Backbone.Router {
      static routes = {
        '': function() {
          expect(true).to.be.ok;
        }
      };
    };
    var myRouter = new MyRouter();
    Backbone.History.instance.start({ root: '®ooτ', pushState: true });
  });

  it('#4025 - navigate updates URL hash as is', function() {
    var route = 'search/has%20space';
    Backbone.History.instance.navigate(route);
    expect(location.hash).to.eql('#' + route);
  });
});

import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';
import chaiAsPromised from 'chai-as-promised';

import { expect, use } from 'chai';

use(chaiAsPromised);

describe('Backbone.Events', () => {
  it('extending a class with mixin', function () {
    class Test {}
    var TestWithEvents = Backbone.withEvents(Test);
    expect(TestWithEvents.prototype.on).to.equal(Backbone.Events.prototype.on);
    expect(TestWithEvents.prototype.off).to.equal(Backbone.Events.prototype.off);
    expect(TestWithEvents.prototype.trigger).to.equal(Backbone.Events.prototype.trigger);

    expect(Test.prototype.on).to.not.be.ok;
    expect(Test.prototype.off).to.not.be.ok;
    expect(Test.prototype.trigger).to.not.be.ok;
  });

  it('extending a class with decorator', function () {
    @Backbone.withEvents
    class Test {}
    expect(Test.prototype.on).to.equal(Backbone.Events.prototype.on);
    expect(Test.prototype.off).to.equal(Backbone.Events.prototype.off);
    expect(Test.prototype.trigger).to.equal(Backbone.Events.prototype.trigger);
    expect(Test.name).to.equal('Test');
  });

  it('on and trigger', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);
    obj.on('event', function () {
      obj.counter += 1;
    });
    obj.trigger('event');
    expect(obj.counter).to.equal(1, 'counter should be incremented.');
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counter).to.equal(5, 'counter should be incremented five times.');
  });

  it('on decorator', function () {
    var counter = 0;
    var eventThis;
    class Test extends Backbone.Events {
      @Backbone.on('event')
      eventHandler() {
        eventThis = this;
        counter++;
      }
    }

    var obj = new Test();
    obj.trigger('event');
    expect(counter).to.equal(1, 'counter should be incremented.');
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(counter).to.equal(5, 'counter should be incremented five times.');
    expect(eventThis).to.equal(obj, 'event this should be object instance.');
  });

  it('on decorator subclassing', function () {
    var eventCounter = 0;
    var subEventCounter = 0;
    var eventThis;
    var subEventThis;
    class Test extends Backbone.Events {
      @Backbone.on('event')
      eventHandler() {
        eventThis = this;
        eventCounter++;
      }
    }

    class SubTest extends Test {
      @Backbone.on('subevent')
      subEventHandler() {
        subEventThis = this;
        subEventCounter++;
      }
    }

    class OtherSubTest extends Test {}

    var subObj = new SubTest();
    var otherSubObj = new OtherSubTest();
    subObj.trigger('event');
    expect(eventCounter).to.equal(1, 'counter should be incremented.');
    subObj.trigger('subevent');
    expect(subEventCounter).to.equal(1, 'sub class counter should be incremented.');
    expect(eventThis).to.equal(subObj, 'event this should be object instance.');
    expect(subEventThis).to.equal(subObj, 'sub class event this should be object instance.');

    otherSubObj.trigger('event');
    expect(eventCounter).to.equal(2, 'counter should be incremented.');
    expect(eventThis).to.equal(otherSubObj, 'event this should be other object instance.');
    otherSubObj.trigger('subevent');
    expect(subEventCounter).to.equal(
      1,
      'sub class counter should not be incremented on other sub class.',
    );
  });

  it('binding and triggering multiple events', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);

    obj.on('a b c', function () {
      obj.counter += 1;
    });

    obj.trigger('a');
    expect(obj.counter).to.equal(1);

    obj.trigger('a b');
    expect(obj.counter).to.equal(3);

    obj.trigger('c');
    expect(obj.counter).to.equal(4);

    obj.off('a c');
    obj.trigger('a b c');
    expect(obj.counter).to.equal(5);
  });

  it('binding and triggering with event maps', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);

    var increment = function () {
      this.counter += 1;
    };

    obj.on(
      {
        a: increment,
        b: increment,
        c: increment,
      },
      obj,
    );

    obj.trigger('a');
    expect(obj.counter).to.equal(1);

    obj.trigger('a b');
    expect(obj.counter).to.equal(3);

    obj.trigger('c');
    expect(obj.counter).to.equal(4);

    obj.off(
      {
        a: increment,
        c: increment,
      },
      obj,
    );
    obj.trigger('a b c');
    expect(obj.counter).to.equal(5);
  });

  it('binding and triggering multiple event names with event maps', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);

    var increment = function () {
      this.counter += 1;
    };

    obj.on({
      'a b c': increment,
    });

    obj.trigger('a');
    expect(obj.counter).to.equal(1);

    obj.trigger('a b');
    expect(obj.counter).to.equal(3);

    obj.trigger('c');
    expect(obj.counter).to.equal(4);

    obj.off({
      'a c': increment,
    });
    obj.trigger('a b c');
    expect(obj.counter).to.equal(5);
  });

  it('binding and trigger with event maps context', function () {
    var obj = { counter: 0 };
    var context = {};
    Backbone.Events.extend(obj);

    obj
      .on(
        {
          a: function () {
            expect(this).to.equal(context, 'defaults `context` to `callback` param');
          },
        },
        context,
      )
      .trigger('a');

    obj
      .off()
      .on(
        {
          a: function () {
            expect(this).to.equal(context, 'will not override explicit `context` param');
          },
        },
        this,
        context,
      )
      .trigger('a');
  });

  it('listenTo and stopListening', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenTo(b, 'all', function () {
      expect(true).to.be.ok;
    });
    b.trigger('anything');
    a.listenTo(b, 'all', function () {
      expect(false).to.be.ok;
    });
    a.stopListening();
    b.trigger('anything');
  });

  it('listenTo and stopListening with event maps', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    var cb = function () {
      expect(true).to.be.ok;
    };
    a.listenTo(b, { event: cb });
    b.trigger('event');
    a.listenTo(b, { event2: cb });
    b.on('event2', cb);
    a.stopListening(b, { event2: cb });
    b.trigger('event event2');
    a.stopListening();
    b.trigger('event event2');
  });

  it('stopListening with omitted args', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    var cb = function () {
      expect(true).to.be.ok;
    };
    a.listenTo(b, 'event', cb);
    b.on('event', cb);
    a.listenTo(b, 'event2', cb);
    a.stopListening(null, { event: cb });
    b.trigger('event event2');
    b.off();
    a.listenTo(b, 'event event2', cb);
    a.stopListening(null, 'event');
    a.stopListening();
    b.trigger('event2');
  });

  it('listenToOnce', function () {
    // Same as the previous test, but we use once rather than having to explicitly unbind
    var obj = { counterA: 0, counterB: 0 };
    Backbone.Events.extend(obj);
    var incrA = function () {
      obj.counterA += 1;
      obj.trigger('event');
    };
    var incrB = function () {
      obj.counterB += 1;
    };
    obj.listenToOnce(obj, 'event', incrA);
    obj.listenToOnce(obj, 'event', incrB);
    obj.trigger('event');
    expect(obj.counterA).to.equal(1, 'counterA should have only been incremented once.');
    expect(obj.counterB).to.equal(1, 'counterB should have only been incremented once.');
  });

  it('listenToOnce and stopListening', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenToOnce(b, 'all', function () {
      expect(true).to.be.ok;
    });
    b.trigger('anything');
    b.trigger('anything');
    a.listenToOnce(b, 'all', function () {
      expect(false).to.be.ok;
    });
    a.stopListening();
    b.trigger('anything');
  });

  it('listenTo, listenToOnce and stopListening', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenToOnce(b, 'all', function () {
      expect(true).to.be.ok;
    });
    b.trigger('anything');
    b.trigger('anything');
    a.listenTo(b, 'all', function () {
      expect(false).to.be.ok;
    });
    a.stopListening();
    b.trigger('anything');
  });

  it('listenTo and stopListening with event maps', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenTo(b, {
      change: function () {
        expect(true).to.be.ok;
      },
    });
    b.trigger('change');
    a.listenTo(b, {
      change: function () {
        expect(false).to.be.ok;
      },
    });
    a.stopListening();
    b.trigger('change');
  });

  it('listenTo yourself', function () {
    var e = Backbone.Events.extend({});
    e.listenTo(e, 'foo', function () {
      expect(true).to.be.ok;
    });
    e.trigger('foo');
  });

  it('listenTo yourself cleans yourself up with stopListening', function () {
    var e = Backbone.Events.extend({});
    e.listenTo(e, 'foo', function () {
      expect(true).to.be.ok;
    });
    e.trigger('foo');
    e.stopListening();
    e.trigger('foo');
  });

  it('stopListening cleans up references', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    var fn = function () {};
    b.on('event', fn);
    a.listenTo(b, 'event', fn).stopListening();
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn).stopListening(b);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn).stopListening(b, 'event');
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn).stopListening(b, 'event', fn);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
  });

  it('stopListening cleans up references from listenToOnce', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    var fn = function () {};
    b.on('event', fn);
    a.listenToOnce(b, 'event', fn).stopListening();
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenToOnce(b, 'event', fn).stopListening(b);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenToOnce(b, 'event', fn).stopListening(b, 'event');
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenToOnce(b, 'event', fn).stopListening(b, 'event', fn);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._events.event)).to.equal(1);
    expect(_.size(b._listeners)).to.equal(0);
  });

  it('listenTo and off cleaning up references', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    var fn = function () {};
    a.listenTo(b, 'event', fn);
    b.off();
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn);
    b.off('event');
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn);
    b.off(null, fn);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._listeners)).to.equal(0);
    a.listenTo(b, 'event', fn);
    b.off(null, null, a);
    expect(_.size(a._listeningTo)).to.equal(0);
    expect(_.size(b._listeners)).to.equal(0);
  });

  it('listenTo and stopListening cleaning up references', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenTo(b, 'all', function () {
      expect(true).to.be.ok;
    });
    b.trigger('anything');
    a.listenTo(b, 'other', function () {
      expect(false).to.be.ok;
    });
    a.stopListening(b, 'other');
    a.stopListening(b, 'all');
    expect(_.size(a._listeningTo)).to.equal(0);
  });

  it('listenToOnce without context cleans up references after the event has fired', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenToOnce(b, 'all', function () {
      expect(true).to.be.ok;
    });
    b.trigger('anything');
    expect(_.size(a._listeningTo)).to.equal(0);
  });

  it('listenToOnce with event maps cleans up references', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenToOnce(b, {
      one: function () {
        expect(true).to.be.ok;
      },
      two: function () {
        expect(false).to.be.ok;
      },
    });
    b.trigger('one');
    expect(_.size(a._listeningTo)).to.equal(1);
  });

  it('listenToOnce with event maps binds the correct `this`', function () {
    var a = Backbone.Events.extend({});
    var b = Backbone.Events.extend({});
    a.listenToOnce(b, {
      one: function () {
        expect(this).to.equal(a);
      },
      two: function () {
        expect(false).to.be.ok;
      },
    });
    b.trigger('one');
  });

  it("listenTo with empty callback doesn't throw an error", function () {
    var e = Backbone.Events.extend({});
    e.listenTo(e, 'foo', null);
    e.trigger('foo');
    expect(true).to.be.ok;
  });

  it('trigger all for each event', function () {
    var obj = { counter: 0 };
    var a, b;
    Backbone.Events.extend(obj);
    obj
      .on('all', function (event) {
        obj.counter++;
        if (event === 'a') a = true;
        if (event === 'b') b = true;
      })
      .trigger('a b');
    expect(a).to.be.ok;
    expect(b).to.be.ok;
    expect(obj.counter).to.equal(2);
  });

  it('on, then unbind all functions', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);
    var callback = function () {
      obj.counter += 1;
    };
    obj.on('event', callback);
    obj.trigger('event');
    obj.off('event');
    obj.trigger('event');
    expect(obj.counter).to.equal(1, 'counter should have only been incremented once.');
  });

  it('bind two callbacks, unbind only one', function () {
    var obj = { counterA: 0, counterB: 0 };
    Backbone.Events.extend(obj);
    var callback = function () {
      obj.counterA += 1;
    };
    obj.on('event', callback);
    obj.on('event', function () {
      obj.counterB += 1;
    });
    obj.trigger('event');
    obj.off('event', callback);
    obj.trigger('event');
    expect(obj.counterA).to.equal(1, 'counterA should have only been incremented once.');
    expect(obj.counterB).to.equal(2, 'counterB should have been incremented twice.');
  });

  it('unbind a callback in the midst of it firing', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);
    var callback = function () {
      obj.counter += 1;
      obj.off('event', callback);
    };
    obj.on('event', callback);
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counter).to.equal(1, 'the callback should have been unbound.');
  });

  it('two binds that unbind themeselves', function () {
    var obj = { counterA: 0, counterB: 0 };
    Backbone.Events.extend(obj);
    var incrA = function () {
      obj.counterA += 1;
      obj.off('event', incrA);
    };
    var incrB = function () {
      obj.counterB += 1;
      obj.off('event', incrB);
    };
    obj.on('event', incrA);
    obj.on('event', incrB);
    obj.trigger('event');
    obj.trigger('event');
    obj.trigger('event');
    expect(obj.counterA).to.equal(1, 'counterA should have only been incremented once.');
    expect(obj.counterB).to.equal(1, 'counterB should have only been incremented once.');
  });

  it('bind a callback with a default context when none supplied', function () {
    var obj = Backbone.Events.extend({
      assertTrue: function () {
        expect(this).to.equal(obj, '`this` was bound to the callback');
      },
    });

    obj.once('event', obj.assertTrue);
    obj.trigger('event');
  });

  it('bind a callback with a supplied context', function () {
    var TestClass = function () {
      return this;
    };
    TestClass.prototype.assertTrue = function () {
      expect(true).to.be.ok;
    };

    var obj = Backbone.Events.extend({});
    obj.on(
      'event',
      function () {
        this.assertTrue();
      },
      new TestClass(),
    );
    obj.trigger('event');
  });

  it('nested trigger with unbind', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);
    var incr1 = function () {
      obj.counter += 1;
      obj.off('event', incr1);
      obj.trigger('event');
    };
    var incr2 = function () {
      obj.counter += 1;
    };
    obj.on('event', incr1);
    obj.on('event', incr2);
    obj.trigger('event');
    expect(obj.counter).to.equal(3, 'counter should have been incremented three times');
  });

  it('callback list is not altered during trigger', function () {
    var counter = 0,
      obj = Backbone.Events.extend({});
    var incr = function () {
      counter++;
    };
    var incrOn = function () {
      obj.on('event all', incr);
    };
    var incrOff = function () {
      obj.off('event all', incr);
    };

    obj.on('event all', incrOn).trigger('event');
    expect(counter).to.equal(0, 'on does not alter callback list');

    obj.off().on('event', incrOff).on('event all', incr).trigger('event');
    expect(counter).to.equal(2, 'off does not alter callback list');
  });

  it("#1282 - 'all' callback list is retrieved after each event.", function () {
    var counter = 0;
    var obj = Backbone.Events.extend({});
    var incr = function () {
      counter++;
    };
    obj
      .on('x', function () {
        obj.on('y', incr).on('all', incr);
      })
      .trigger('x y');
    expect(counter).to.equal(2);
  });

  it('if no callback is provided, `on` is a noop', function () {
    Backbone.Events.extend({}).on('test').trigger('test');
  });

  it('if callback is truthy but not a function, `on` should throw an error just like jQuery', function () {
    var view = Backbone.Events.extend({}).on('test', 'noop');
    expect(function () {
      view.trigger('test');
    }).to['throw']();
  });

  it('remove all events for a specific context', function () {
    var obj = Backbone.Events.extend({});
    obj.on('x y all', function () {
      expect(true).to.be.ok;
    });
    obj.on(
      'x y all',
      function () {
        expect(false).to.be.ok;
      },
      obj,
    );
    obj.off(null, null, obj);
    obj.trigger('x y');
  });

  it('remove all events for a specific callback', function () {
    var obj = Backbone.Events.extend({});
    var success = function () {
      expect(true).to.be.ok;
    };
    var fail = function () {
      expect(false).to.be.ok;
    };
    obj.on('x y all', success);
    obj.on('x y all', fail);
    obj.off(null, fail);
    obj.trigger('x y');
  });

  it('#1310 - off does not skip consecutive events', function () {
    var obj = Backbone.Events.extend({});
    obj.on(
      'event',
      function () {
        expect(false).to.be.ok;
      },
      obj,
    );
    obj.on(
      'event',
      function () {
        expect(false).to.be.ok;
      },
      obj,
    );
    obj.off(null, null, obj);
    obj.trigger('event');
  });

  it('once', function () {
    // Same as the previous test, but we use once rather than having to explicitly unbind
    var obj = { counterA: 0, counterB: 0 };
    Backbone.Events.extend(obj);
    var incrA = function () {
      obj.counterA += 1;
      obj.trigger('event');
    };
    var incrB = function () {
      obj.counterB += 1;
    };
    obj.once('event', incrA);
    obj.once('event', incrB);
    obj.trigger('event');
    expect(obj.counterA).to.equal(1, 'counterA should have only been incremented once.');
    expect(obj.counterB).to.equal(1, 'counterB should have only been incremented once.');
  });

  it('once variant one', function () {
    var f = function () {
      expect(true).to.be.ok;
    };

    var a = Backbone.Events.extend({}).once('event', f);
    var b = Backbone.Events.extend({}).on('event', f);

    a.trigger('event');

    b.trigger('event');
    b.trigger('event');
  });

  it('once variant two', function () {
    var f = function () {
      expect(true).to.be.ok;
    };
    var obj = Backbone.Events.extend({});

    obj.once('event', f).on('event', f).trigger('event').trigger('event');
  });

  it('once with off', function () {
    var f = function () {
      expect(true).to.be.ok;
    };
    var obj = Backbone.Events.extend({});

    obj.once('event', f);
    obj.off('event', f);
    obj.trigger('event');
  });

  it('once with event maps', function () {
    var obj = { counter: 0 };
    Backbone.Events.extend(obj);

    var increment = function () {
      this.counter += 1;
    };

    obj.once(
      {
        a: increment,
        b: increment,
        c: increment,
      },
      obj,
    );

    obj.trigger('a');
    expect(obj.counter).to.equal(1);

    obj.trigger('a b');
    expect(obj.counter).to.equal(2);

    obj.trigger('c');
    expect(obj.counter).to.equal(3);

    obj.trigger('a b c');
    expect(obj.counter).to.equal(3);
  });

  it('bind a callback with a supplied context using once with object notation', function () {
    var obj = { counter: 0 };
    var context = {};
    Backbone.Events.extend(obj);

    obj
      .once(
        {
          a: function () {
            expect(this).to.equal(context, 'defaults `context` to `callback` param');
          },
        },
        context,
      )
      .trigger('a');
  });

  it('once with off only by context', function () {
    var context = {};
    var obj = Backbone.Events.extend({});
    obj.once(
      'event',
      function () {
        expect(false).to.be.ok;
      },
      context,
    );
    obj.off(null, null, context);
    obj.trigger('event');
  });

  it('Backbone object inherits Events', function () {
    var obj = Backbone.Events.extend({});
    expect(obj.on).to.equal(Backbone.Events.prototype.on);
  });

  it('once with asynchronous events', function (done) {
    var func = _.debounce(function () {
      expect(true).to.be.ok;
      done();
    }, 50);
    var obj = Backbone.Events.extend({}).once('async', func);

    obj.trigger('async');
    obj.trigger('async');
  });

  it('once with multiple events.', function () {
    var obj = Backbone.Events.extend({});
    obj.once('x y', function () {
      expect(true).to.be.ok;
    });
    obj.trigger('x y');
  });

  it('Off during iteration with once.', function () {
    var obj = Backbone.Events.extend({});
    var f = function () {
      this.off('event', f);
    };
    obj.on('event', f);
    obj.once('event', function () {});
    obj.on('event', function () {
      expect(true).to.be.ok;
    });

    obj.trigger('event');
    obj.trigger('event');
  });

  it('`once` on `all` should work as expected', function () {
    var obj = Backbone.Events.extend({});
    obj.once('all', function () {
      expect(true).to.be.ok;
      obj.trigger('all');
    });
    obj.trigger('all');
  });

  it('once without a callback is a noop', function () {
    Backbone.Events.extend({}).once('event').trigger('event');
  });

  it('listenToOnce without a callback is a noop', function () {
    var obj = Backbone.Events.extend({});
    obj.listenToOnce(obj, 'event').trigger('event');
  });

  it('event functions are chainable', function () {
    var obj = Backbone.Events.extend({});
    var obj2 = Backbone.Events.extend({});
    var fn = function () {};
    expect(obj).to.equal(obj.trigger('noeventssetyet'));
    expect(obj).to.equal(obj.off('noeventssetyet'));
    expect(obj).to.equal(obj.stopListening('noeventssetyet'));
    expect(obj).to.equal(obj.on('a', fn));
    expect(obj).to.equal(obj.once('c', fn));
    expect(obj).to.equal(obj.trigger('a'));
    expect(obj).to.equal(obj.listenTo(obj2, 'a', fn));
    expect(obj).to.equal(obj.listenToOnce(obj2, 'b', fn));
    expect(obj).to.equal(obj.off('a c'));
    expect(obj).to.equal(obj.stopListening(obj2, 'a'));
    expect(obj).to.equal(obj.stopListening());
  });

  it('#3448 - listenToOnce with space-separated events', function () {
    var one = Backbone.Events.extend({});
    var two = Backbone.Events.extend({});
    var count = 1;
    one.listenToOnce(two, 'x y', function (n) {
      expect(n).to.equal(count++);
    });
    two.trigger('x', 1);
    two.trigger('x', 1);
    two.trigger('y', 2);
    two.trigger('y', 2);
  });

  it('#3611 - listenTo is compatible with non-Backbone event libraries', function () {
    var obj = Backbone.Events.extend({});
    var other = {
      events: {},
      on: function (name, callback) {
        this.events[name] = callback;
      },
      trigger: function (name) {
        this.events[name]();
      },
    };

    obj.listenTo(other, 'test', function () {
      expect(true).to.be.ok;
    });
    other.trigger('test');
  });

  it('#3611 - stopListening is compatible with non-Backbone event libraries', function () {
    var obj = Backbone.Events.extend({});
    var other = {
      events: {},
      on: function (name, callback) {
        this.events[name] = callback;
      },
      off: function () {
        this.events = {};
      },
      trigger: function (name) {
        var fn = this.events[name];
        if (fn) fn();
      },
    };

    obj.listenTo(other, 'test', function () {
      expect(false).to.be.ok;
    });
    obj.stopListening(other);
    other.trigger('test');
    expect(_.size(obj._listeningTo)).to.equal(0);
  });
});

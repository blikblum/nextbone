import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';

import { assert } from '@esm-bundle/chai';
import 'chai/chai.js';

const { expect } = window.chai;

describe('Backbone.Model', function() {
  let ProxyModel, Klass, doc, collection;
  let syncArgs, originalSync;
  let ajaxSettings, originalAjax, ajaxResponse;

  before(function() {
    // Capture the arguments to Backbone.sync for comparison.
    originalSync = Backbone.sync.handler;
    Backbone.sync.handler = function(method, model, options) {
      syncArgs = {
        method: method,
        model: model,
        options: options
      };
      return originalSync.apply(this, arguments);
    };

    originalAjax = Backbone.ajax.handler;
    Backbone.ajax.handler = async function(settings) {
      ajaxSettings = settings;
      var response = ajaxResponse;
      ajaxResponse = undefined;
      await Promise.resolve();
      return response;
    };
  });

  after(function() {
    Backbone.sync.handler = originalSync;
    Backbone.ajax.handler = originalAjax;
  });

  beforeEach(function() {
    ProxyModel = class extends Backbone.Model {};
    Klass = class extends Backbone.Collection {
      url() {
        return '/collection';
      }
    };
    doc = new ProxyModel({
      id: '1-the-tempest',
      title: 'The Tempest',
      author: 'Bill Shakespeare',
      length: 123
    });
    collection = new Klass();
    collection.add(doc);
  });

  it('initialize', function() {
    let Model = class extends Backbone.Model {
      initialize() {
        this.one = 1;
        expect(this.collection).to.equal(collection);
      }
    };
    let model = new Model({}, { collection: collection });
    expect(model.one).to.equal(1);
    expect(model.collection).to.equal(collection);
  });

  it('Object.prototype properties are overridden by attributes', function() {
    let model = new Backbone.Model({ hasOwnProperty: true });
    expect(model.get('hasOwnProperty')).to.be['true'];
  });

  it('initialize with attributes and options', function() {
    let Model = class extends Backbone.Model {
      initialize(attributes, options) {
        this.one = options.one;
      }
    };
    let model = new Model({}, { one: 1 });
    expect(model.one).to.equal(1);
  });

  it('initialize with parsed attributes', function() {
    let Model = class extends Backbone.Model {
      parse(attrs) {
        attrs.value += 1;
        return attrs;
      }
    };
    let model = new Model({ value: 1 }, { parse: true });
    expect(model.get('value')).to.equal(2);
  });

  it('preinitialize', function() {
    let Model = class extends Backbone.Model {
      preinitialize() {
        this.one = 1;
      }
    };
    let model = new Model({}, { collection: collection });
    expect(model.one).to.equal(1);
    expect(model.collection).to.equal(collection);
  });

  it('preinitialize occurs before the model is set up', function() {
    let Model = class extends Backbone.Model {
      preinitialize() {
        expect(this.collection).to.be.undefined;
        expect(this.cid).to.be.undefined;
        expect(this.id).to.be.undefined;
      }
    };
    let model = new Model({ id: 'foo' }, { collection: collection });
    expect(model.collection).to.equal(collection);
    expect(model.id).to.equal('foo');
    expect(model.cid).to.not.be.undefined;
  });

  it('parse can return null', function() {
    let Model = class extends Backbone.Model {
      parse(attrs) {
        attrs.value += 1;
        return null;
      }
    };
    let model = new Model({ value: 1 }, { parse: true });
    expect(JSON.stringify(model.toJSON())).to.equal('{}');
  });

  it('url', function() {
    doc.urlRoot = null;
    expect(doc.url()).to.equal('/collection/1-the-tempest');
    doc.collection.url = '/collection/';
    expect(doc.url()).to.equal('/collection/1-the-tempest');
    expect(function() {
      doc.collection = null;
      doc.url();
    }).to['throw'](Error);
    doc.collection = collection;
  });

  it('url when using urlRoot, and uri encoding', function() {
    let Model = class extends Backbone.Model {
      urlRoot = '/collection';
    };
    let model = new Model();
    expect(model.url()).to.equal('/collection');
    model.set({ id: '+1+' });
    expect(model.url()).to.equal('/collection/%2B1%2B');
  });

  it('url when using urlRoot as a function to determine urlRoot at runtime', function() {
    let Model = class extends Backbone.Model {
      urlRoot() {
        return '/nested/' + this.get('parentId') + '/collection';
      }
    };

    let model = new Model({ parentId: 1 });
    expect(model.url()).to.equal('/nested/1/collection');
    model.set({ id: 2 });
    expect(model.url()).to.equal('/nested/1/collection/2');
  });

  it('underscore methods', function() {
    let model = new Backbone.Model({ foo: 'a', bar: 'b', baz: 'c' });
    expect(model.keys()).to.deep.equal(['foo', 'bar', 'baz']);
    expect(model.values()).to.deep.equal(['a', 'b', 'c']);
    expect(model.invert()).to.deep.equal({ a: 'foo', b: 'bar', c: 'baz' });
    expect(model.pick('foo', 'baz')).to.deep.equal({ foo: 'a', baz: 'c' });
    expect(model.omit('foo', 'bar')).to.deep.equal({ baz: 'c' });
  });

  it('chain', function() {
    this.skip();
  });

  it('clone', function() {
    let a = new Backbone.Model({ foo: 1, bar: 2, baz: 3 });
    let b = a.clone();
    expect(a.get('foo')).to.equal(1);
    expect(a.get('bar')).to.equal(2);
    expect(a.get('baz')).to.equal(3);
    expect(b.get('foo')).to.equal(a.get('foo'));
    expect(b.get('bar')).to.equal(a.get('bar'));
    expect(b.get('baz')).to.equal(a.get('baz'));
    a.set({ foo: 100 });
    expect(a.get('foo')).to.equal(100);
    expect(b.get('foo')).to.equal(1);

    let foo = new Backbone.Model({ p: 1 });
    let bar = new Backbone.Model({ p: 2 });
    bar.set(foo.clone().attributes, { unset: true });
    expect(foo.get('p')).to.equal(1);
    expect(bar.get('p')).to.be.undefined;

    class MyModel extends Backbone.Model {
      assign(source) {
        expect(true).to.be['true'];
        super.assign(source);
      }
    }

    let c = new MyModel();
    c.clone();
  });

  it('clone nested object / array', function() {
    let a = new Backbone.Model({ foo: { x: 1 }, bar: ['a'], x: 'a', y: 1, w: null, z: undefined });
    let b = a.clone();
    expect(a.get('foo')).to.deep.equal({ x: 1 });
    expect(a.get('bar')).to.deep.equal(['a']);

    expect(b.get('foo')).to.deep.equal(a.get('foo'));
    expect(b.get('bar')).to.deep.equal(a.get('bar'));

    let foo = a.get('foo');
    foo.x = 100;
    expect(a.get('foo')).to.deep.equal({ x: 100 });
    expect(b.get('foo')).to.deep.equal({ x: 1 });

    let bar = a.get('bar');
    bar[0] = 'b';
    expect(a.get('bar')).to.deep.equal(['b']);
    expect(b.get('bar')).to.deep.equal(['a']);
  });

  it('clone date', function() {
    let date = new Date();
    let a = new Backbone.Model({ foo: date });
    let b = a.clone();
    expect(a.get('foo')).to.equal(date);
    expect(b.get('foo')).to.equal(a.get('foo'));
  });

  it('clone class', function() {
    class FooClass {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    }
    let foo = new FooClass(1, 2);
    let a = new Backbone.Model({ foo: foo });
    let b = a.clone();
    expect(b.get('foo')).to.be.an['instanceof'](FooClass);
    expect(a.get('foo')).to.equal(foo);
    expect(b.get('foo')).to.equal(a.get('foo'));
  });

  it('isNew', function() {
    let a = new Backbone.Model({ foo: 1, bar: 2, baz: 3 });
    expect(a.isNew()).to.be['true'];
    a = new Backbone.Model({ foo: 1, bar: 2, baz: 3, id: -5 });
    expect(a.isNew()).to.be['false'];
    a = new Backbone.Model({ foo: 1, bar: 2, baz: 3, id: 0 });
    expect(a.isNew()).to.be['false'];
    expect(new Backbone.Model().isNew()).to.be['true'];
    expect(new Backbone.Model({ id: 2 }).isNew()).to.be['false'];
    expect(new Backbone.Model({ id: -5 }).isNew()).to.be['false'];
  });

  it('get', function() {
    expect(doc.get('title')).to.equal('The Tempest');
    expect(doc.get('author')).to.equal('Bill Shakespeare');
  });

  it('escape', function() {
    expect(doc.escape('title')).to.equal('The Tempest');
    doc.set({ audience: 'Bill & Bob' });
    expect(doc.escape('audience')).to.equal('Bill &amp; Bob');
    doc.set({ audience: 'Tim > Joan' });
    expect(doc.escape('audience')).to.equal('Tim &gt; Joan');
    doc.set({ audience: 10101 });
    expect(doc.escape('audience')).to.equal('10101');
    doc.unset('audience');
    expect(doc.escape('audience')).to.equal('');
  });

  it('has', function() {
    let model = new Backbone.Model();

    expect(model.has('name')).to.be['false'];

    model.set({
      0: 0,
      1: 1,
      true: true,
      false: false,
      empty: '',
      name: 'name',
      null: null,
      undefined: undefined
    });

    expect(model.has('0')).to.be['true'];
    expect(model.has('1')).to.be['true'];
    expect(model.has('true')).to.be['true'];
    expect(model.has('false')).to.be['true'];
    expect(model.has('empty')).to.be['true'];
    expect(model.has('name')).to.be['true'];

    model.unset('name');

    expect(model.has('name')).to.be['false'];
    expect(model.has('null')).to.be['false'];
    expect(model.has('undefined')).to.be['false'];
  });

  it('matches', function() {
    let model = new Backbone.Model();

    expect(model.matches({ name: 'Jonas', cool: true })).to.be['false'];

    model.set({ name: 'Jonas', cool: true });

    expect(model.matches({ name: 'Jonas' })).to.be['true'];
    expect(model.matches({ name: 'Jonas', cool: true })).to.be['true'];
    expect(model.matches({ name: 'Jonas', cool: false })).to.be['false'];
  });

  it('matches with predicate', function() {
    let model = new Backbone.Model({ a: 0 });

    expect(
      model.matches(function(attr) {
        return attr.a > 1 && attr.b != null;
      })
    ).to.be['false'];

    model.set({ a: 3, b: true });

    expect(
      model.matches(function(attr) {
        return attr.a > 1 && attr.b != null;
      })
    ).to.be['true'];
  });

  it('set and unset', function() {
    let a = new Backbone.Model({ id: 'id', foo: 1, bar: 2, baz: 3 });
    let changeCount = 0;
    a.on('change:foo', function() {
      changeCount += 1;
    });
    a.set({ foo: 2 });
    expect(a.get('foo')).to.equal(2);
    expect(changeCount).to.equal(1);
    // set with value that is not new shouldn't fire change event
    a.set({ foo: 2 });
    expect(a.get('foo')).to.equal(2);
    expect(changeCount).to.equal(1);

    a.validate = function(attrs) {
      expect(attrs.foo).to.be.undefined;
    };
    a.unset('foo', { validate: true });
    expect(a.get('foo')).to.be.undefined;
    delete a.validate;
    expect(changeCount).to.equal(2);

    a.unset('id');
    expect(a.id).to.be.undefined;
  });

  it('set with reset option', function() {
    let a = new Backbone.Model({ id: 'id', foo: 1, bar: 2 });
    let changeFooCount = 0;
    let changeBarCount = 0;
    let changeBazCount = 0;
    let changeIdCount = 0;
    a.on('change:foo', function() {
      changeFooCount += 1;
    });
    a.on('change:bar', function() {
      changeBarCount += 1;
    });
    a.on('change:baz', function() {
      changeBazCount += 1;
    });
    a.on('change:id', function() {
      changeIdCount += 1;
    });
    a.set({ foo: 2, bar: 2, baz: 3 }, { reset: true });
    expect(a.get('foo')).to.equal(2);
    expect(changeFooCount).to.equal(1);

    expect(a.get('id')).to.be.undefined;
    expect(changeIdCount).to.equal(1);

    expect(a.get('bar')).to.equal(2);
    expect(changeBarCount).to.equal(0);

    expect(a.get('baz')).to.equal(3);
    expect(changeBazCount).to.equal(1);
  });

  it('#2030 - set with reset option', function() {
    let a = new Backbone.Model({ id: 'id', foo: 1, bar: 2 });
    let changeFooCount = 0;
    let changeBarCount = 0;
    let changeBazCount = 0;
    let changeIdCount = 0;
    a.on('change:foo', function() {
      changeFooCount += 1;
    });
    a.on('change:bar', function() {
      changeBarCount += 1;
    });
    a.on('change:baz', function() {
      changeBazCount += 1;
    });
    a.on('change:id', function() {
      changeIdCount += 1;
    });
    a.set({ foo: 2, bar: 2, baz: 3 }, { reset: true });
    expect(a.get('foo')).to.equal(2);
    expect(changeFooCount).to.equal(1);

    expect(a.get('id')).to.be.undefined;
    expect(changeIdCount).to.equal(1);

    expect(a.get('bar')).to.equal(2);
    expect(changeBarCount).to.equal(0);

    expect(a.get('baz')).to.equal(3);
    expect(changeBazCount).to.equal(1);
  });

  it('#2030 - set with failed validate, followed by another set triggers change', function() {
    let attr = 0,
      main = 0,
      error = 0;
    let Model = class extends Backbone.Model {
      validate(attrs) {
        if (attrs.x > 1) {
          error++;
          return 'this is an error';
        }
      }
    };
    let model = new Model({ x: 0 });
    model.on('change:x', function() {
      attr++;
    });
    model.on('change', function() {
      main++;
    });
    model.set({ x: 2 }, { validate: true });
    model.set({ x: 1 }, { validate: true });
    expect(attr).to.equal(2);
    expect(main).to.equal(2);
    expect(error).to.equal(1);
  });

  it('set triggers changes in the correct order', function() {
    let value = null;
    let model = new Backbone.Model();
    model.on('last', function() {
      value = 'last';
    });
    model.on('first', function() {
      value = 'first';
    });
    model.trigger('first');
    model.trigger('last');
    expect(value).to.equal('last');
  });

  it('set falsy values in the correct order', function() {
    let model = new Backbone.Model({ result: 'result' });
    model.on('change', function() {
      expect(model.changed.result).to.be.undefined;
      expect(model.previous('result')).to.be['false'];
    });
    model.set({ result: undefined }, { silent: true });
    model.set({ result: null }, { silent: true });
    model.set({ result: false }, { silent: true });
    model.set({ result: undefined });
  });

  it('nested set triggers with the correct options', function() {
    let model = new Backbone.Model();
    let o1 = {};
    let o2 = {};
    let o3 = {};
    model.on('change', function(__, options) {
      switch (model.get('a')) {
        case 1:
          expect(options).to.equal(o1);
          return model.set('a', 2, o2);
        case 2:
          expect(options).to.equal(o2);
          return model.set('a', 3, o3);
        case 3:
          expect(options).to.equal(o3);
      }
    });
    model.set('a', 1, o1);
  });

  it('multiple unsets', function() {
    let i = 0;
    let counter = function() {
      i++;
    };
    let model = new Backbone.Model({ a: 1 });
    model.on('change:a', counter);
    model.set({ a: 2 });
    model.unset('a');
    model.unset('a');
    expect(i).to.equal(2);
  });

  it('unset and changedAttributes', function() {
    let model = new Backbone.Model({ a: 1 });
    model.on('change', function() {
      expect('a' in model.changedAttributes()).to.be['true'];
    });
    model.unset('a');
  });

  it('using a non-default id attribute.', function() {
    let MongoModel = class extends Backbone.Model {
      static idAttribute = '_id';
    };
    let model = new MongoModel({ id: 'eye-dee', _id: 25, title: 'Model' });
    expect(model.get('id')).to.equal('eye-dee');
    expect(model.id).to.equal(25);
    expect(model.isNew()).to.be['false'];
    model.unset('_id');
    expect(model.id).to.be.undefined;
    expect(model.isNew()).to.be['true'];
  });

  it('setting an alternative cid prefix', function() {
    var Model = class extends Backbone.Model {
      static cidPrefix = 'm';
    };
    var model = new Model();

    expect(model.cid.charAt(0)).to.equal('m');

    model = new Backbone.Model();
    expect(model.cid.charAt(0)).to.equal('c');

    var Collection = class extends Backbone.Collection {
      static model = Model;
    };
    var col = new Collection([{ id: 'c5' }, { id: 'c6' }, { id: 'c7' }]);

    expect(col.get('c6').cid.charAt(0)).to.equal('m');
    col.set([{ id: 'c6', value: 'test' }], {
      merge: true,
      add: true,
      remove: false
    });
    expect(col.get('c6').has('value')).to.be['true'];
  });

  it('set an empty string', function() {
    var model = new Backbone.Model({ name: 'Model' });
    model.set({ name: '' });
    expect(model.get('name')).to.equal('');
  });

  it('setting an object', function(done) {
    var model = new Backbone.Model({
      custom: { foo: 1 }
    });
    model.on('change', function() {
      done(); // Assertion is the fact that this callback was called
    });
    model.set({
      custom: { foo: 1 } // no change should be fired
    });
    model.set({
      custom: { foo: 2 } // change event should be fired
    });
  });

  it('clear', function() {
    var changed;
    var model = new Backbone.Model({ id: 1, name: 'Model' });
    model.on('change:name', function() {
      changed = true;
    });
    model.on('change', function() {
      var changedAttrs = model.changedAttributes();
      expect('name' in changedAttrs).to.be['true'];
    });
    model.clear();
    expect(changed).to.equal(true);
    expect(model.get('name')).to.equal(undefined);
  });

  it('defaults', function() {
    var Defaulted = class extends Backbone.Model {
      static defaults = {
        one: 1,
        two: 2
      };
    };
    var model = new Defaulted({ two: undefined });
    expect(model.get('one')).to.equal(1);
    expect(model.get('two')).to.equal(2);
    model = new Defaulted({ two: 3 });
    expect(model.get('one')).to.equal(1);
    expect(model.get('two')).to.equal(3);
    Defaulted = class extends Backbone.Model {
      defaults() {
        return {
          one: 3,
          two: 4
        };
      }
    };
    model = new Defaulted({ two: undefined });
    expect(model.get('one')).to.equal(3);
    expect(model.get('two')).to.equal(4);
    Defaulted = class extends Backbone.Model {
      static defaults = { hasOwnProperty: true };
    };
    model = new Defaulted();
    expect(model.get('hasOwnProperty')).to.equal(true);
    model = new Defaulted({ hasOwnProperty: undefined });
    expect(model.get('hasOwnProperty')).to.equal(true);
    model = new Defaulted({ hasOwnProperty: false });
    expect(model.get('hasOwnProperty')).to.equal(false);
  });

  it('change, hasChanged, changedAttributes, previous, previousAttributes', function() {
    var model = new Backbone.Model({ name: 'Tim', age: 10 });
    expect(model.changedAttributes()).to.equal(false);
    model.on('change', function() {
      expect(model.hasChanged('name')).to.be['true'];
      expect(model.hasChanged('age')).to.be['false'];
      expect(model.changedAttributes()).to.deep.equal({ name: 'Rob' });
      expect(model.previous('name')).to.equal('Tim');
      expect(model.previousAttributes()).to.deep.equal({ name: 'Tim', age: 10 });
    });
    expect(model.hasChanged()).to.equal(false);
    expect(model.hasChanged(undefined)).to.equal(false);
    model.set({ name: 'Rob' });
    expect(model.get('name')).to.equal('Rob');
  });

  it('changedAttributes', function() {
    const model = new Backbone.Model({ a: 'a', b: 'b' });
    assert.deepEqual(model.changedAttributes(), false);
    assert.equal(model.changedAttributes({ a: 'a' }), false);
    assert.equal(model.changedAttributes({ a: 'b' }).a, 'b');
  });

  it('change with options', function() {
    let value;
    const model = new Backbone.Model({ name: 'Rob' });
    model.on('change', function(m, options) {
      value = options.prefix + m.get('name');
    });
    model.set({ name: 'Bob' }, { prefix: 'Mr. ' });
    assert.equal(value, 'Mr. Bob');
    model.set({ name: 'Sue' }, { prefix: 'Ms. ' });
    assert.equal(value, 'Ms. Sue');
  });

  it('change after initialize', function() {
    let changed = 0;
    const attrs = { id: 1, label: 'c' };
    const obj = new Backbone.Model(attrs);
    obj.on('change', function() {
      changed += 1;
    });
    obj.set(attrs);
    assert.equal(changed, 0);
  });

  it('save within change event', function() {
    let model = new Backbone.Model({ firstName: 'Taylor', lastName: 'Swift' });
    model.url = '/test';
    model.on('change', function() {
      model.save();
      assert.ok(_.isEqual(syncArgs.model, model));
    });
    model.set({ lastName: 'Hicks' });
  });

  it('validate after save', function(done) {
    let lastError,
      model = new Backbone.Model();
    model.validate = function(attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.sync = async function(method, options) {
      return { admin: true };
    };
    model.on('invalid', function(m, error) {
      lastError = error;
    });
    model.save(null).then(function() {
      assert.equal(lastError, "Can't change admin status.");
      assert.equal(model.validationError, "Can't change admin status.");
      done();
    });
  });

  it('save', function() {
    doc.save({ title: 'Henry V' });
    assert.equal(syncArgs.method, 'update');
    assert.ok(_.isEqual(syncArgs.model, doc));
  });

  it('save, fetch, destroy triggers error event when an error occurs', function(done) {
    let count = 0;
    let model = new Backbone.Model();
    model.url = '/test';
    model.on('error', function() {
      assert.ok(true);
      count++;
      if (count === 3) {
        done();
      }
    });

    ajaxResponse = Promise.reject();
    model.save({ data: 2, id: 1 });
    ajaxResponse = Promise.reject();
    model.fetch();
    ajaxResponse = Promise.reject();
    model.destroy();
  });

  it('#3283 - save, fetch, destroy calls success with context', function(done) {
    let count = 0;
    let model = new Backbone.Model();
    model.url = '/test';
    let obj = {};
    let options = {
      context: obj,
      success: function() {
        assert.equal(this, obj);
        count++;
        if (count === 3) {
          done();
        }
      }
    };
    model.save({ data: 2, id: 1 }, options);
    model.fetch(options);
    model.destroy(options);
  });

  it('#3283 - save, fetch, destroy calls error with context', function(done) {
    let count = 0;
    let model = new Backbone.Model();
    model.url = '/test';
    let obj = {};
    let options = {
      context: obj,
      error: function() {
        assert.equal(this, obj);
        count++;
        if (count === 3) {
          done();
        }
      }
    };
    ajaxResponse = Promise.reject();
    model.save({ data: 2, id: 1 }, options);
    ajaxResponse = Promise.reject();
    model.fetch(options);
    ajaxResponse = Promise.reject();
    model.destroy(options);
  });

  it('#3470 - save and fetch with parse false', function(done) {
    let i = 0;
    let model = new Backbone.Model();
    model.url = '/test';
    model.parse = function() {
      assert.ok(false);
    };
    model.sync = async function(method, options) {
      return { i: ++i };
    };
    model.fetch({ parse: false }).then(function() {
      assert.equal(model.get('i'), 1);
    });

    model.save(null, { parse: false }).then(function() {
      assert.equal(model.get('i'), 2);
      done();
    });
  });

  it('save with PATCH', function() {
    doc.clear().set({ id: 1, a: 1, b: 2, c: 3, d: 4 });
    doc.save();
    assert.equal(syncArgs.method, 'update');
    assert.equal(syncArgs.options.attrs, undefined);

    doc.save({ b: 2, d: 4 }, { patch: true });
    assert.equal(syncArgs.method, 'patch');
    assert.equal(_.size(syncArgs.options.attrs), 2);
    assert.equal(syncArgs.options.attrs.d, 4);
    assert.equal(syncArgs.options.attrs.a, undefined);
    assert.equal(ajaxSettings.data, '{"b":2,"d":4}');
  });
});

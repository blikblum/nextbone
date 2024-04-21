import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';
import { chaiAsPromised } from 'chai-promised';

import { assert } from '@esm-bundle/chai';
import 'chai/chai.js';

const { expect } = window.chai;
window.chai.use(chaiAsPromised);

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

  it.skip('chain', function() {
    var model = new Backbone.Model({ a: 0, b: 1, c: 2 });
    assert.deepEqual(
      model
        .chain()
        .pick('a', 'b', 'c')
        .values()
        .compact()
        .value(),
      [1, 2]
    );
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

  it('save with PATCH and different attrs', function() {
    doc.clear().save({ b: 2, d: 4 }, { patch: true, attrs: { B: 1, D: 3 } });
    expect(syncArgs.options.attrs.D).to.equal(3);
    expect(syncArgs.options.attrs.d).to.be.undefined;
    expect(ajaxSettings.data).to.equal('{"B":1,"D":3}');
    expect(doc.attributes).to.deep.equal({ b: 2, d: 4 });
  });

  it('save in positional style', function() {
    var model = new Backbone.Model();
    model.url = '/test';
    model.save('title', 'Twelfth Night');
    expect(model.get('title')).to.equal('Twelfth Night');
  });

  it('save with non-object (empty string) success response', function(done) {
    var model = new Backbone.Model();
    model.url = '/test';
    ajaxResponse = '';
    model.save(
      { testing: 'empty' },
      {
        success: function(m) {
          expect(m.attributes).to.deep.equal({ testing: 'empty' });
          done();
        }
      }
    );
  });

  it('save with non-object (null) success response', function(done) {
    var model = new Backbone.Model();
    model.url = '/test';
    ajaxResponse = null;
    model.save(
      { testing: 'empty' },
      {
        success: function(m) {
          expect(m.attributes).to.deep.equal({ testing: 'empty' });
          done();
        }
      }
    );
  });

  it('save with wait and supplied id', function() {
    var Model = class extends Backbone.Model {
      urlRoot = '/collection';
    };
    var model = new Model();
    model.save({ id: 42 }, { wait: true });
    expect(ajaxSettings.url).to.equal('/collection/42');
  });

  it('save will pass extra options to success callback', function(done) {
    var SpecialSyncModel = class extends Backbone.Model {
      sync(method, options) {
        _.extend(options, { specialSync: true });
        return super.sync(method, options);
      }
      urlRoot = '/test';
    };

    var model = new SpecialSyncModel();

    var onSuccess = function(m, response, options) {
      expect(options.specialSync).to.be.true;
      done();
    };

    model.save(null, { success: onSuccess });
  });

  it('fetch', function() {
    doc.fetch();
    expect(syncArgs.method).to.equal('read');
    expect(_.isEqual(syncArgs.model, doc)).to.be.true;
  });

  it('fetch will pass extra options to success callback', function(done) {
    var SpecialSyncModel = class extends Backbone.Model {
      sync(method, options) {
        _.extend(options, { specialSync: true });
        return super.sync(method, options);
      }
      urlRoot = '/test';
    };

    var model = new SpecialSyncModel();

    var onSuccess = function(m, response, options) {
      expect(options.specialSync).to.be.true;
      done();
    };

    model.fetch({ success: onSuccess });
  });

  it('`fetch` promise should resolve after success callback', function(done) {
    var successCalled = false;
    var model = new Backbone.Model({ x: 1, y: 2 });
    model.url = '/x';
    model.fetch({ success: () => (successCalled = true) }).then(() => {
      expect(successCalled).to.be.true;
      done();
    });
  });

  it('customized sync', function(done) {
    var model;
    var SpecialSyncModel = class extends Backbone.Model {
      sync(method, options) {
        expect(this).to.equal(model);
        expect(method).to.equal('read');
        return Promise.resolve({ x: 'y' });
      }
      urlRoot = '/test';
    };

    model = new SpecialSyncModel();

    var onSuccess = function(m, response, options) {
      expect(response).to.deep.equal({ x: 'y' });
      done();
    };

    model.fetch({ success: onSuccess });
  });

  it('destroy', function(done) {
    doc.destroy();
    expect(syncArgs.method).to.equal('delete');
    expect(_.isEqual(syncArgs.model, doc)).to.be.true;

    var newModel = new Backbone.Model();
    newModel.destroy().then(function(value) {
      expect(value).to.be.undefined;
      done();
    });
  });

  it('destroy will pass extra options to success callback', function(done) {
    var SpecialSyncModel = class extends Backbone.Model {
      sync(method, options) {
        _.extend(options, { specialSync: true });
        return super.sync(method, options);
      }
      urlRoot = '/test';
    };

    var model = new SpecialSyncModel({ id: 'id' });

    var onSuccess = function(m, response, options) {
      expect(options.specialSync).to.be.true;
      done();
    };

    model.destroy({ success: onSuccess });
  });

  it('`destroy` promise should resolve after success callback', function(done) {
    var successCalled = false;
    var model = new Backbone.Model({ x: 1, y: 2 });
    model.destroy({ success: () => (successCalled = true) }).then(() => {
      expect(successCalled).to.be.true;
      done();
    });
  });

  it('non-persisted destroy', function() {
    var a = new Backbone.Model({ foo: 1, bar: 2, baz: 3 });
    a.sync = function() {
      throw 'should not be called';
    };
    a.destroy();
    expect(true).to.be.true;
  });

  it('isLoading with successful fetch', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let resolve;
    ajaxResponse = new Promise(function(res, rej) {
      resolve = res;
    });
    let successCalled = false;
    model.on('load', function() {
      expect(successCalled).to.be.true;
      expect(model.get('a')).to.equal(1);
    });
    expect(model.isLoading).to.equal(false);
    model
      .fetch({
        success() {
          expect(model.isLoading).to.equal(false);
          successCalled = true;
        }
      })
      .then(function() {
        expect(model.isLoading).to.equal(false);
        expect(successCalled).to.be.true;
        done();
      });
    expect(model.isLoading).to.equal(true);
    resolve({ a: 1 });
  });

  it('isLoading with failed fetch', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let reject;
    let errorCalled = false;
    ajaxResponse = new Promise(function(res, rej) {
      reject = rej;
    });
    model.on('load', function() {
      expect(errorCalled).to.be.true;
    });
    expect(model.isLoading).to.equal(false);
    model
      .fetch({
        error() {
          errorCalled = true;
          expect(model.isLoading).to.equal(false);
        }
      })
      .catch(function() {
        expect(model.isLoading).to.equal(false);
        expect(errorCalled).to.be.true;
        done();
      });
    expect(model.isLoading).to.equal(true);
    reject({ fail: true });
  });

  it('waitLoading with successful fetch', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let resolve;
    let loadCalled = false;
    let changeCalled = false;
    let fetchResolved = false;
    ajaxResponse = new Promise(function(res, rej) {
      resolve = res;
    });
    model.on('load', function() {
      loadCalled = true;
    });
    model.on('change', function() {
      changeCalled = true;
    });
    expect(model.isLoading).to.equal(false);
    model.fetch().then(function() {
      fetchResolved = true;
    });
    expect(model.isLoading).to.equal(true);
    Backbone.waitLoading(model).then(() => {
      expect(model.isLoading).to.equal(false);
      expect(loadCalled).to.be.true;
      expect(changeCalled).to.be.true;
      expect(fetchResolved).to.be.true;
      expect(model.get('a')).to.equal(1);
      done();
    });
    resolve({ a: 1 });
  });

  it('waitLoading with failed fetch', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let reject;
    let loadCalled = false;
    let fetchResolved = false;
    ajaxResponse = new Promise(function(res, rej) {
      reject = rej;
    });

    model.on('load', function() {
      loadCalled = true;
    });

    expect(model.isLoading).to.equal(false);
    model.fetch().catch(function() {
      fetchResolved = true;
    });

    expect(model.isLoading).to.equal(true);
    Backbone.waitLoading(model).then(() => {
      expect(model.isLoading).to.equal(false);
      expect(loadCalled).to.be.true;
      expect(fetchResolved).to.be.true;
      done();
    });
    reject();
  });

  it('isLoading with successful save', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let resolve;
    ajaxResponse = new Promise(function(res, rej) {
      resolve = res;
    });
    expect(model.isLoading).to.equal(false);
    model
      .save(null, {
        success() {
          expect(model.isLoading).to.equal(false);
        }
      })
      .then(function() {
        expect(model.isLoading).to.equal(false);
        done();
      });
    expect(model.isLoading).to.equal(true);
    resolve({ a: 1 });
  });

  it('isLoading with failed save', function(done) {
    let model = new Backbone.Model();
    model.url = '/test';
    let reject;
    ajaxResponse = new Promise(function(res, rej) {
      reject = rej;
    });
    expect(model.isLoading).to.equal(false);
    model
      .save(null, {
        error() {
          expect(model.isLoading).to.equal(false);
        }
      })
      .catch(function() {
        expect(model.isLoading).to.equal(false);
        done();
      });
    expect(model.isLoading).to.equal(true);
    reject({ fail: true });
  });

  it('isLoading with successful destroy', function(done) {
    let model = new Backbone.Model({ id: 1 });
    model.url = '/test';
    let resolve;
    ajaxResponse = new Promise(function(res, rej) {
      resolve = res;
    });
    expect(model.isLoading).to.equal(false);
    model
      .destroy({
        success() {
          expect(model.isLoading).to.equal(false);
        }
      })
      .then(function() {
        expect(model.isLoading).to.equal(false);
        done();
      });
    expect(model.isLoading).to.equal(true);
    resolve({ a: 1 });
  });

  it('isLoading with failed destroy', function(done) {
    let model = new Backbone.Model({ id: 1 });
    model.url = '/test';
    let reject;
    ajaxResponse = new Promise(function(res, rej) {
      reject = rej;
    });
    expect(model.isLoading).to.equal(false);
    model
      .destroy({
        error() {
          expect(model.isLoading).to.equal(false);
        }
      })
      .catch(function() {
        expect(model.isLoading).to.equal(false);
        done();
      });
    expect(model.isLoading).to.equal(true);
    reject({ fail: true });
  });

  it('validate', function() {
    var lastError;
    var model = new Backbone.Model();
    model.validate = function(attrs) {
      if (attrs.admin !== this.get('admin')) return "Can't change admin status.";
    };
    model.on('invalid', function(m, error) {
      lastError = error;
    });
    var result = model.set({ a: 100 });
    expect(result).to.equal(model);
    expect(model.get('a')).to.equal(100);
    expect(lastError).to.be.undefined;
    result = model.set({ admin: true });
    expect(model.get('admin')).to.be.true;
    result = model.set({ a: 200, admin: false }, { validate: true });
    expect(lastError).to.equal("Can't change admin status.");
    expect(model.validationError).to.equal("Can't change admin status.");
    expect(result).to.equal(model);
    expect(model.get('a')).to.equal(200);
  });

  it('validate on unset and clear', function() {
    var error;
    var model = new Backbone.Model({ name: 'One' });
    model.validate = function(attrs) {
      if (!attrs.name) {
        error = true;
        return 'No thanks.';
      }
    };
    model.set({ name: 'Two' });
    expect(model.get('name')).to.equal('Two');
    expect(error).to.be.undefined;
    model.unset('name', { validate: true });
    expect(error).to.be.true;
    expect(model.get('name')).to.be.undefined;
    model.set({ name: 'Two' });
    model.clear({ validate: true });
    expect(model.get('name')).to.be.undefined;
    delete model.validate;
    model.clear();
    expect(model.get('name')).to.be.undefined;
  });

  it('validate with error callback', function() {
    var lastError, boundError;
    var model = new Backbone.Model();
    model.validate = function(attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.on('invalid', function(m, error) {
      boundError = true;
    });
    var result = model.set({ a: 100 }, { validate: true });
    expect(result).to.equal(model);
    expect(model.get('a')).to.equal(100);
    expect(model.validationError).to.be.null;
    expect(boundError).to.be.undefined;
    result = model.set({ a: 200, admin: true }, { validate: true });
    expect(result).to.equal(model);
    expect(model.get('a')).to.equal(200);
    expect(model.validationError).to.equal("Can't change admin status.");
    expect(boundError).to.be.true;
  });

  it('defaults always extend attrs (#459)', function() {
    var Defaulted = class extends Backbone.Model {
      defaults() {
        return { one: 1 };
      }
      initialize(attrs, opts) {
        expect(this.attributes.one).to.equal(1);
      }
    };
    var providedattrs = new Defaulted({});
    var emptyattrs = new Defaulted();
  });

  it('Inherit class properties', function() {
    var Parent = class extends Backbone.Model {
      static classProp = function() {};

      instancePropSame() {}
      instancePropDiff() {}
    };

    var Child = class extends Parent {
      instancePropDiff() {}
    };

    var adult = new Parent();
    var kid = new Child();

    expect(Child.classProp).to.equal(Parent.classProp);
    expect(Child.classProp).to.not.be.undefined;

    expect(kid.instancePropSame).to.equal(adult.instancePropSame);
    expect(kid.instancePropSame).to.not.be.undefined;

    expect(Child.prototype.instancePropDiff).to.not.equal(Parent.prototype.instancePropDiff);
    expect(Child.prototype.instancePropDiff).to.not.be.undefined;
  });

  it("Nested change events don't clobber previous attributes", function() {
    new Backbone.Model()
      .on('change:state', function(m, newState) {
        expect(m.previous('state')).to.be.undefined;
        expect(newState).to.equal('hello');
        // Fire a nested change event.
        m.set({ other: 'whatever' });
      })
      .on('change:state', function(m, newState) {
        expect(m.previous('state')).to.be.undefined;
        expect(newState).to.equal('hello');
      })
      .set({ state: 'hello' });
  });

  it('hasChanged/set should use same comparison', function() {
    var changed = 0,
      model = new Backbone.Model({ a: null });
    model
      .on('change', function() {
        expect(this.hasChanged('a')).to.be.true;
      })
      .on('change:a', function() {
        changed++;
      })
      .set({ a: undefined });
    expect(changed).to.equal(1);
  });

  it('#582, #425, change:attribute callbacks should fire after all changes have occurred', function() {
    var model = new Backbone.Model();

    var assertion = function() {
      expect(model.get('a')).to.equal('a');
      expect(model.get('b')).to.equal('b');
      expect(model.get('c')).to.equal('c');
    };

    model.on('change:a', assertion);
    model.on('change:b', assertion);
    model.on('change:c', assertion);

    model.set({ a: 'a', b: 'b', c: 'c' });
  });

  it('#871, set with attributes property', function() {
    var model = new Backbone.Model();
    model.set({ attributes: true });
    expect(model.has('attributes')).to.be.true;
  });

  it('set value regardless of equality/change', function() {
    var model = new Backbone.Model({ x: [] });
    var a = [];
    model.set({ x: a });
    expect(model.get('x') === a).to.be.true;
  });

  it('set same value does not trigger change', function() {
    var model = new Backbone.Model({ x: 1 });
    model.on('change change:x', function() {
      expect(false).to.be.true;
    });
    model.set({ x: 1 });
    model.set({ x: 1 });
  });

  it('unset does not fire a change for undefined attributes', function() {
    var model = new Backbone.Model({ x: undefined });
    model.on('change:x', function() {
      expect(false).to.be.true;
    });
    model.unset('x');
  });

  it('set: undefined values', function() {
    var model = new Backbone.Model({ x: undefined });
    expect('x' in model.attributes).to.be.true;
  });

  it('hasChanged works outside of change events, and true within', function() {
    var model = new Backbone.Model({ x: 1 });
    model.on('change:x', function() {
      expect(model.hasChanged('x')).to.be.true;
      expect(model.get('x')).to.equal(1);
    });
    model.set({ x: 2 }, { silent: true });
    expect(model.hasChanged()).to.be.true;
    expect(model.hasChanged('x')).to.be.true;
    model.set({ x: 1 });
    expect(model.hasChanged()).to.be.true;
    expect(model.hasChanged('x')).to.be.true;
  });

  it('hasChanged gets cleared on the following set', function() {
    var model = new Backbone.Model();
    model.set({ x: 1 });
    expect(model.hasChanged()).to.be.true;
    model.set({ x: 1 });
    expect(model.hasChanged()).to.be.false;
    model.set({ x: 2 });
    expect(model.hasChanged()).to.be.true;
    model.set({});
    expect(model.hasChanged()).to.be.false;
  });

  it('save with `wait` succeeds without `validate`', function() {
    var model = new Backbone.Model();
    model.url = '/test';
    model.save({ x: 1 }, { wait: true });
    expect(syncArgs.model === model).to.be.true;
  });

  it('save without `wait` set invalid attributes but returns rejected promise', function() {
    var model = new Backbone.Model();
    model.validate = function() {
      return 1;
    };
    expect(model.save({ a: 1 })).to.be.rejectedWith(Backbone.ValidationError);
    expect(model.get('a')).to.equal(1);
  });

  it("save doesn't validate twice", function(done) {
    var model = new Backbone.Model();
    var times = 0;
    model.url = '/test';

    model.validate = function() {
      ++times;
    };
    model.save({}).then(function() {
      expect(times).to.equal(1);
      done();
    });
  });

  it('`hasChanged` for falsey keys', function() {
    var model = new Backbone.Model();
    model.set({ x: true }, { silent: true });
    expect(model.hasChanged(0)).to.be.false;
    expect(model.hasChanged('')).to.be.false;
  });

  it('`previous` for falsey keys', function() {
    var model = new Backbone.Model({ '0': true, '': true });
    model.set({ '0': false, '': false }, { silent: true });
    expect(model.previous(0)).to.equal(true);
    expect(model.previous('')).to.equal(true);
  });

  it('`save` with `wait` sends correct attributes', function() {
    var changed = 0;
    var model = new Backbone.Model({ x: 1, y: 2 });
    model.url = '/test';
    model.on('change:x', function() {
      changed++;
    });
    model.save({ x: 3 }, { wait: true });
    expect(JSON.parse(ajaxSettings.data)).to.eql({ x: 3, y: 2 });
    expect(model.get('x')).to.equal(1);
    expect(changed).to.equal(0);
    syncArgs.options.success({});
    expect(model.get('x')).to.equal(3);
    expect(changed).to.equal(1);
  });

  it("a failed `save` with `wait` doesn't leave attributes behind", function() {
    var model = new Backbone.Model();
    model.url = '/test';
    model.save({ x: 1 }, { wait: true });
    expect(model.get('x')).to.be.undefined;
  });

  it('#1030 - `save` with `wait` results in correct attributes if success is called during sync', function(done) {
    var model = new Backbone.Model({ x: 1, y: 2 });
    model.url = '/test';
    model.on('change:x', function() {
      expect(true).to.be.true;
    });
    model.save({ x: 3 }, { wait: true }).then(function() {
      expect(model.get('x')).to.equal(3);
      done();
    });
  });

  it('save with wait validates attributes', function() {
    var model = new Backbone.Model();
    model.url = '/test';
    model.validate = function() {
      expect(true).to.be.true;
    };
    model.save({ x: 1 }, { wait: true });
  });

  it('save turns on parse flag', function() {
    var Model = class extends Backbone.Model {
      async sync(method, options) {
        expect(options.parse).to.be.true;
      }
    };
    new Model().save();
  });

  it('`save` promise should resolve after success callback', function(done) {
    var successCalled = false;
    var model = new Backbone.Model({ x: 1, y: 2 });
    model.url = '/x';
    model.save({ x: 3 }, { success: () => (successCalled = true) }).then(() => {
      expect(successCalled).to.be.true;
      done();
    });
  });

  it("nested `set` during `'change:attr'`", function() {
    var events = [];
    var model = new Backbone.Model();
    model.on('all', function(event) {
      events.push(event);
    });
    model.on('change', function() {
      model.set({ z: true }, { silent: true });
    });
    model.on('change:x', function() {
      model.set({ y: true });
    });
    model.set({ x: true });
    expect(events).to.eql(['change:y', 'change:x', 'change']);
    events = [];
    model.set({ z: true });
    expect(events).to.eql([]);
  });

  it('nested `change` only fires once', function() {
    var model = new Backbone.Model();
    model.on('change', function() {
      expect(true).to.be.true;
      model.set({ x: true });
    });
    model.set({ x: true });
  });

  it("nested `set` during `'change'`", function() {
    var count = 0;
    var model = new Backbone.Model();
    model.on('change', function() {
      switch (count++) {
        case 0:
          expect(this.changedAttributes()).to.eql({ x: true });
          expect(model.previous('x')).to.be.undefined;
          model.set({ y: true });
          break;
        case 1:
          expect(this.changedAttributes()).to.eql({ x: true, y: true });
          expect(model.previous('x')).to.be.undefined;
          model.set({ z: true });
          break;
        case 2:
          expect(this.changedAttributes()).to.eql({
            x: true,
            y: true,
            z: true
          });
          expect(model.previous('y')).to.be.undefined;
          break;
        default:
          expect(false).to.be.true;
      }
    });
    model.set({ x: true });
  });

  it('nested `change` with silent', function() {
    var count = 0;
    var model = new Backbone.Model();
    model.on('change:y', function() {
      expect(false).to.be.true;
    });
    model.on('change', function() {
      switch (count++) {
        case 0:
          expect(this.changedAttributes()).to.eql({ x: true });
          model.set({ y: true }, { silent: true });
          model.set({ z: true });
          break;
        case 1:
          expect(this.changedAttributes()).to.eql({
            x: true,
            y: true,
            z: true
          });
          break;
        case 2:
          expect(this.changedAttributes()).to.eql({ z: false });
          break;
        default:
          expect(false).to.be.true;
      }
    });
    model.set({ x: true });
    model.set({ z: false });
  });

  it('nested `change:attr` with silent', function() {
    var model = new Backbone.Model();
    model.on('change:y', function() {
      expect(false).to.be.true;
    });
    model.on('change', function() {
      model.set({ y: true }, { silent: true });
      model.set({ z: true });
    });
    model.set({ x: true });
  });

  it('multiple nested changes with silent', function() {
    var model = new Backbone.Model();
    model.on('change:x', function() {
      model.set({ y: 1 }, { silent: true });
      model.set({ y: 2 });
    });
    model.on('change:y', function(m, val) {
      expect(val).to.equal(2);
    });
    model.set({ x: true });
  });

  it('multiple nested changes with silent', function() {
    var changes = [];
    var model = new Backbone.Model();
    model.on('change:b', function(m, val) {
      changes.push(val);
    });
    model.on('change', function() {
      model.set({ b: 1 });
    });
    model.set({ b: 0 });
    expect(changes).to.eql([0, 1]);
  });

  it('basic silent change semantics', function() {
    var model = new Backbone.Model();
    model.set({ x: 1 });
    model.on('change', function() {
      expect(true).to.be.true;
    });
    model.set({ x: 2 }, { silent: true });
    model.set({ x: 1 });
  });

  it('nested set multiple times', function() {
    var model = new Backbone.Model();
    model.on('change:b', function() {
      expect(true).to.be.true;
    });
    model.on('change:a', function() {
      model.set({ b: true });
      model.set({ b: true });
    });
    model.set({ a: true });
  });

  it('#1122 - clear does not alter options.', function() {
    var model = new Backbone.Model();
    var options = {};
    model.clear(options);
    expect(options.unset).to.be.undefined;
  });

  it('#1122 - unset does not alter options.', function() {
    var model = new Backbone.Model();
    var options = {};
    model.unset('x', options);
    expect(options.unset).to.be.undefined;
  });

  it('#1355 - `options` is passed to success callbacks', function(done) {
    var model = new Backbone.Model();
    var opts = {
      success: function(m, resp, options) {
        expect(options).to.exist;
      }
    };

    model.url = '/test';

    Promise.all([model.save({ id: 1 }, opts), model.fetch(opts), model.destroy(opts)]).then(
      function() {
        done();
      }
    );
  });

  it("#1412 - Trigger 'sync' event.", function(done) {
    var model = new Backbone.Model({ id: 1 });
    model.url = '/test';
    model.on('sync', function() {
      expect(true).to.be.true;
    });
    Promise.all([model.fetch(), model.save(), model.destroy()]).then(function() {
      done();
    });
  });

  it('#1365 - Destroy: New models execute success callback.', function(done) {
    new Backbone.Model()
      .on('sync', function() {
        expect(false).to.be.true;
      })
      .on('destroy', function() {
        expect(true).to.be.true;
      })
      .destroy({
        success: function() {
          expect(true).to.be.true;
          done();
        }
      });
  });

  it('#1433 - Save: An invalid model cannot be persisted.', function(done) {
    var model = new Backbone.Model();
    model.validate = function() {
      return 'invalid';
    };
    model.sync = function() {
      expect(false).to.be.true;
    };

    var promise = model.save();

    expect(promise).to.be.rejected;
    promise.catch(function() {
      done();
    });
  });

  it("#1377 - Save without attrs triggers 'error'.", function() {
    var Model = class extends Backbone.Model {
      url = '/test/';
      sync(method, options) {
        options.success();
      }
      validate() {
        return 'invalid';
      }
    };
    var model = new Model({ id: 1 });
    model.on('invalid', function() {
      expect(true).to.be.true;
    });
    expect(model.save()).to.be.rejected;
  });

  it('#1545 - `undefined` can be passed to a model constructor without coersion', function() {
    var Model = class extends Backbone.Model {
      defaults() {
        return { one: 1 };
      }
      initialize(attrs, opts) {
        expect(attrs).to.be.undefined;
      }
    };
    var emptyattrs = new Model();
    var undefinedattrs = new Model(undefined);
  });

  it('#1478 - Model `save` does not trigger change on unchanged attributes', function(done) {
    var Model = class extends Backbone.Model {
      sync(method, options) {
        return new Promise(function(resolve) {
          setTimeout(function() {
            options.success();
            done();
            resolve();
          }, 0);
        });
      }
    };
    new Model({ x: true })
      .on('change:x', function() {
        assert.ok(false);
      })
      .save(null, { wait: true });
  });

  it('#1664 - Changing from one value, silently to another, back to original triggers a change.', function() {
    var model = new Backbone.Model({ x: 1 });
    model.on('change:x', function() {
      assert.ok(true);
    });
    model.set({ x: 2 }, { silent: true });
    model.set({ x: 3 }, { silent: true });
    model.set({ x: 1 });
  });

  it('#1664 - multiple silent changes nested inside a change event', function() {
    var changes = [];
    var model = new Backbone.Model();
    model.on('change', function() {
      model.set({ a: 'c' }, { silent: true });
      model.set({ b: 2 }, { silent: true });
      model.unset('c', { silent: true });
    });
    model.on('change:a change:b change:c', function(m, val) {
      changes.push(val);
    });
    model.set({ a: 'a', b: 1, c: 'item' });
    assert.deepEqual(changes, ['a', 1, 'item']);
    assert.deepEqual(model.attributes, { a: 'c', b: 2 });
  });

  it('#1791 - `attributes` is available for `parse`', function() {
    var Model = class extends Backbone.Model {
      parse() {
        this.has('a');
      } // shouldn't throw an error
    };
    var model = new Model(null, { parse: true });
  });

  it('silent changes in last `change` event back to original triggers change', function() {
    var changes = [];
    var model = new Backbone.Model();
    model.on('change:a change:b change:c', function(m, val) {
      changes.push(val);
    });
    model.on('change', function() {
      model.set({ a: 'c' }, { silent: true });
    });
    model.set({ a: 'a' });
    assert.deepEqual(changes, ['a']);
    model.set({ a: 'a' });
    assert.deepEqual(changes, ['a', 'a']);
  });

  it('#1943 change calculations should use _.isEqual', function() {
    var model = new Backbone.Model({ a: { key: 'value' } });
    model.set('a', { key: 'value' }, { silent: true });
    assert.equal(model.changedAttributes(), false);
  });

  it('#1964 - final `change` event is always fired, regardless of interim changes', function() {
    var model = new Backbone.Model();
    model.on('change:property', function() {
      model.set('property', 'bar');
    });
    model.on('change', function() {
      assert.ok(true);
    });
    model.set('property', 'foo');
  });

  it('isValid', function() {
    var model = new Backbone.Model({ valid: true });
    model.validate = function(attrs) {
      if (!attrs.valid) return 'invalid';
    };
    assert.equal(model.isValid(), true);
    model.set({ valid: false });
    assert.equal(model.isValid(), false);
  });

  it('#1179 - isValid returns true in the absence of validate.', function() {
    var model = new Backbone.Model();
    model.validate = null;
    assert.ok(model.isValid());
  });

  it('#1961 - Creating a model with {validate:true} will call validate and use the error callback', function() {
    var Model = class extends Backbone.Model {
      validate(attrs) {
        if (attrs.id === 1) return "This shouldn't happen";
      }
    };
    var model = new Model({ id: 1 }, { validate: true });
    assert.equal(model.validationError, "This shouldn't happen");
  });

  it('toJSON receives attrs during save(..., {wait: true})', function() {
    var Model = class extends Backbone.Model {
      url = '/test';
      toJSON() {
        assert.strictEqual(this.attributes.x, 1);
        return _.clone(this.attributes);
      }
    };
    var model = new Model();
    model.save({ x: 1 }, { wait: true });
  });

  it('#2034 - nested set with silent only triggers one change', function() {
    var model = new Backbone.Model();
    model.on('change', function() {
      model.set({ b: true }, { silent: true });
      assert.ok(true);
    });
    model.set({ a: true });
  });

  it('#3778 - id will only be updated if it is set', function() {
    var model = new Backbone.Model({ id: 1 });
    model.id = 2;
    model.set({ foo: 'bar' });
    assert.equal(model.id, 2);
    model.set({ id: 3 });
    assert.equal(model.id, 3);
  });

  it('assign', function() {
    var assignOptions = { x: 'a' };
    var Model = class extends Backbone.Model {
      assignTo(target, options) {
        super.assignTo(target, options);
        assert.equal(options, assignOptions);
      }
    };
    var model = new Model({});
    var sourceModel = new Model({ z: 2 });
    model.assign({ y: 'b' }, assignOptions);
    assert.equal(model.get('y'), 'b');
    model.assign(sourceModel, assignOptions);
    assert.equal(model.get('z'), 2);
  });
});

import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';
import { chaiAsPromised } from 'chai-promised';

import 'chai/chai.js';

const { expect } = window.chai;
window.chai.use(chaiAsPromised);

describe('Backbone.Collection', function () {
  let a, b, c, d, e, col, otherCol;
  let syncArgs, originalSync;
  let ajaxSettings, originalAjax, ajaxResponse;

  before(function () {
    // Capture the arguments to Backbone.sync for comparison.
    originalSync = Backbone.sync.handler;
    Backbone.sync.handler = function (method, model, options) {
      syncArgs = {
        method: method,
        model: model,
        options: options
      };
      return originalSync.apply(this, arguments);
    };

    originalAjax = Backbone.ajax.handler;
    Backbone.ajax.handler = async function (settings) {
      ajaxSettings = settings;
      var response = ajaxResponse;
      ajaxResponse = undefined;
      await Promise.resolve();
      return response;
    };
  });

  after(function () {
    Backbone.sync.handler = originalSync;
    Backbone.ajax.handler = originalAjax;
  });

  beforeEach(function () {
    a = new Backbone.Model({ id: 3, label: 'a' });
    b = new Backbone.Model({ id: 2, label: 'b' });
    c = new Backbone.Model({ id: 1, label: 'c' });
    d = new Backbone.Model({ id: 0, label: 'd' });
    e = null;
    col = new Backbone.Collection([a, b, c, d]);
    otherCol = new Backbone.Collection();
  });

  it('new and sort', function () {
    let counter = 0;
    col.on('sort', function () {
      counter++;
    });
    expect(col.pluck('label')).to.deep.equal(['a', 'b', 'c', 'd']);
    col.comparator = function (m1, m2) {
      return m1.id > m2.id ? -1 : 1;
    };
    col.sort();
    expect(counter).to.equal(1);
    expect(col.pluck('label')).to.deep.equal(['a', 'b', 'c', 'd']);
    col.comparator = function (model) {
      return model.id;
    };
    col.sort();
    expect(counter).to.equal(2);
    expect(col.pluck('label')).to.deep.equal(['d', 'c', 'b', 'a']);
    expect(col.length).to.equal(4);
  });

  it('String comparator.', function () {
    let collection = new Backbone.Collection([{ id: 3 }, { id: 1 }, { id: 2 }], {
      comparator: 'id'
    });
    expect(collection.pluck('id')).to.deep.equal([1, 2, 3]);
  });

  it('new and parse', function () {
    let Collection = class extends Backbone.Collection {
      parse(data) {
        return _.filter(data, function (datum) {
          return datum.a % 2 === 0;
        });
      }
    };
    let models = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }];
    let collection = new Collection(models, { parse: true });
    expect(collection.length).to.equal(2);
    expect(collection.first().get('a')).to.equal(2);
    expect(collection.last().get('a')).to.equal(4);
  });

  it('clone preserves model and comparator', function () {
    let Model = class extends Backbone.Model { };
    let comparator = function (model) {
      return model.id;
    };

    let collection = new Backbone.Collection([{ id: 1 }], {
      model: Model,
      comparator: comparator
    }).clone();
    collection.add({ id: 2 });
    expect(collection.at(0) instanceof Model).to.be.true;
    expect(collection.at(1) instanceof Model).to.be.true;
    expect(collection.comparator).to.equal(comparator);
  });

  it('get', function () {
    expect(col.get(0)).to.equal(d);
    expect(col.get(d.clone())).to.equal(d);
    expect(col.get(2)).to.equal(b);
    expect(col.get({ id: 1 })).to.equal(c);
    expect(col.get(c.clone())).to.equal(c);
    expect(col.get(col.first().cid)).to.equal(col.first());
  });

  it('get with non-default ids', function () {
    let MongoModel = class extends Backbone.Model {
      static idAttribute = '_id';
    };
    let model = new MongoModel({ _id: 100 });
    let collection = new Backbone.Collection([model], { model: MongoModel });
    expect(collection.get(100)).to.equal(model);
    expect(collection.get(model.cid)).to.equal(model);
    expect(collection.get(model)).to.equal(model);
    expect(collection.get(101)).to.be.undefined;

    let collection2 = new Backbone.Collection();
    collection2.model = MongoModel;
    collection2.add(model.attributes);
    expect(collection2.get(model.clone())).to.equal(collection2.first());
  });

  it('has', function () {
    expect(col.has(a)).to.be.true;
    expect(col.has(b)).to.be.true;
    expect(col.has(c)).to.be.true;
    expect(col.has(d)).to.be.true;
    expect(col.has(a.id)).to.be.true;
    expect(col.has(b.id)).to.be.true;
    expect(col.has(c.id)).to.be.true;
    expect(col.has(d.id)).to.be.true;
    expect(col.has(a.cid)).to.be.true;
    expect(col.has(b.cid)).to.be.true;
    expect(col.has(c.cid)).to.be.true;
    expect(col.has(d.cid)).to.be.true;
    let outsider = new Backbone.Model({ id: 4 });
    expect(col.has(outsider)).to.be.false;
    expect(col.has(outsider.id)).to.be.false;
    expect(col.has(outsider.cid)).to.be.false;
  });

  it('update index when id changes', function () {
    let collection = new Backbone.Collection();
    collection.add([{ id: 0, name: 'one' }, { id: 1, name: 'two' }]);
    let one = collection.get(0);
    expect(one.get('name')).to.equal('one');
    collection.on('change:name', function (model) {
      expect(this.get(model)).to.be.ok;
    });
    one.set({ name: 'dalmatians', id: 101 });
    expect(collection.get(0)).to.be.undefined;
    expect(collection.get(101).get('name')).to.equal('dalmatians');
  });

  it('at', function () {
    expect(col.at(2)).to.equal(c);
    expect(col.at(-2)).to.equal(c);
  });

  it('pluck', function () {
    expect(col.pluck('label').join(' ')).to.equal('a b c d');
  });

  it('add', function () {
    let added, opts, secondAdded;
    added = opts = secondAdded = null;
    e = new Backbone.Model({ id: 10, label: 'e' });
    otherCol.add(e);
    otherCol.on('add', function () {
      secondAdded = true;
    });
    col.on('add', function (model, collection, options) {
      added = model.get('label');
      opts = options;
    });
    col.add(e, { amazing: true });
    expect(added).to.equal('e');
    expect(col.length).to.equal(5);
    expect(col.last()).to.equal(e);
    expect(otherCol.length).to.equal(1);
    expect(secondAdded).to.be.null;
    expect(opts.amazing).to.be.true;

    let f = new Backbone.Model({ id: 20, label: 'f' });
    let g = new Backbone.Model({ id: 21, label: 'g' });
    let h = new Backbone.Model({ id: 22, label: 'h' });
    let atCol = new Backbone.Collection([f, g, h]);
    expect(atCol.length).to.equal(3);
    atCol.add(e, { at: 1 });
    expect(atCol.length).to.equal(4);
    expect(atCol.at(1)).to.equal(e);
    expect(atCol.last()).to.equal(h);

    let coll = new Backbone.Collection(new Array(2));
    let addCount = 0;
    coll.on('add', function () {
      addCount += 1;
    });
    coll.add([undefined, f, g]);
    expect(coll.length).to.equal(5);
    expect(addCount).to.equal(3);
    coll.add(new Array(4));
    expect(coll.length).to.equal(9);
    expect(addCount).to.equal(7);
  });

  it('add multiple models', function () {
    let collection = new Backbone.Collection([{ at: 0 }, { at: 1 }, { at: 9 }]);
    collection.add([{ at: 2 }, { at: 3 }, { at: 4 }, { at: 5 }, { at: 6 }, { at: 7 }, { at: 8 }], {
      at: 2
    });
    for (let i = 0; i <= 5; i++) {
      expect(collection.at(i).get('at')).to.equal(i);
    }
  });

  it('add; at should have preference over comparator', function () {
    let Col = class extends Backbone.Collection {
      comparator(m1, m2) {
        return m1.id > m2.id ? -1 : 1;
      }
    };

    let collection = new Col([{ id: 2 }, { id: 3 }]);
    collection.add(new Backbone.Model({ id: 1 }), { at: 1 });

    expect(collection.pluck('id').join(' ')).to.equal('3 1 2');
  });

  it('add; at should add to the end if the index is out of bounds', function () {
    let collection = new Backbone.Collection([{ id: 2 }, { id: 3 }]);
    collection.add(new Backbone.Model({ id: 1 }), { at: 5 });

    expect(collection.pluck('id').join(' ')).to.equal('2 3 1');
  });

  it("can't add model to collection twice", function () {
    let collection = new Backbone.Collection([
      { id: 1 },
      { id: 2 },
      { id: 1 },
      { id: 2 },
      { id: 3 }
    ]);
    expect(collection.pluck('id').join(' ')).to.equal('1 2 3');
  });

  it("can't add different model with same id to collection twice", function () {
    let collection = new Backbone.Collection();
    collection.unshift({ id: 101 });
    collection.add({ id: 101 });
    expect(collection.length).to.equal(1);
  });

  it('merge in duplicate models with {merge: true}', function () {
    let collection = new Backbone.Collection();
    collection.add([{ id: 1, name: 'Moe' }, { id: 2, name: 'Curly' }, { id: 3, name: 'Larry' }]);
    collection.add({ id: 1, name: 'Moses' });
    expect(collection.first().get('name')).to.equal('Moe');
    collection.add({ id: 1, name: 'Moses' }, { merge: true });
    expect(collection.first().get('name')).to.equal('Moses');
    collection.add({ id: 1, name: 'Tim' }, { merge: true, silent: true });
    expect(collection.first().get('name')).to.equal('Tim');
  });

  it('add model to multiple collections', function () {
    let counter = 0;
    let m = new Backbone.Model({ id: 10, label: 'm' });
    m.on('add', function (model, collection) {
      counter++;
      expect(m).to.equal(model);
      if (counter > 1) {
        expect(collection).to.equal(col2);
      } else {
        expect(collection).to.equal(col1);
      }
    });
    let col1 = new Backbone.Collection([]);
    col1.on('add', function (model, collection) {
      expect(m).to.equal(model);
      expect(col1).to.equal(collection);
    });
    let col2 = new Backbone.Collection([]);
    col2.on('add', function (model, collection) {
      expect(m).to.equal(model);
      expect(col2).to.equal(collection);
    });
    col1.add(m);
    expect(m.collection).to.equal(col1);
    col2.add(m);
    expect(m.collection).to.equal(col1);
  });

  it('add model with parse', function () {
    let Model = class extends Backbone.Model {
      parse(obj) {
        obj.value += 1;
        return obj;
      }
    };

    let Col = class extends Backbone.Collection {
      static model = Model;
    };
    let collection = new Col();
    collection.add({ value: 1 }, { parse: true });
    expect(collection.at(0).get('value')).to.equal(2);
  });

  it('add with parse and merge', function () {
    let collection = new Backbone.Collection();
    collection.parse = function (attrs) {
      return _.map(attrs, function (model) {
        if (model.model) return model.model;
        return model;
      });
    };
    collection.add({ id: 1 });
    collection.add({ model: { id: 1, name: 'Alf' } }, { parse: true, merge: true });
    expect(collection.first().get('name')).to.equal('Alf');
  });

  it('add model to collection with sort()-style comparator', function () {
    let collection = new Backbone.Collection();
    collection.comparator = function (m1, m2) {
      return m1.get('name') < m2.get('name') ? -1 : 1;
    };
    let tom = new Backbone.Model({ name: 'Tom' });
    let rob = new Backbone.Model({ name: 'Rob' });
    let tim = new Backbone.Model({ name: 'Tim' });
    collection.add(tom);
    collection.add(rob);
    collection.add(tim);
    expect(collection.indexOf(rob)).to.equal(0);
    expect(collection.indexOf(tim)).to.equal(1);
    expect(collection.indexOf(tom)).to.equal(2);
  });

  it('comparator that depends on `this`', function () {
    let collection = new Backbone.Collection();
    collection.negative = function (num) {
      return -num;
    };
    collection.comparator = function (model) {
      return this.negative(model.id);
    };
    collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(collection.pluck('id')).to.deep.equal([3, 2, 1]);
    collection.comparator = function (m1, m2) {
      return this.negative(m2.id) - this.negative(m1.id);
    };
    collection.sort();
    expect(collection.pluck('id')).to.deep.equal([1, 2, 3]);
  });

  it('remove', function () {
    var removed = null;
    var result = null;
    col.on('remove', function (model, collection, options) {
      removed = model.get('label');
      expect(options.index).to.equal(3);
      expect(collection.get(model)).to.be.undefined;
    });
    result = col.remove(d);
    expect(removed).to.equal('d');
    expect(result).to.equal(d);
    result = col.remove(d);
    expect(result).to.be.undefined;
    expect(col.length).to.equal(3);
    expect(col.first()).to.equal(a);
    col.off();
    result = col.remove([c, d]);
    expect(result.length).to.equal(1);
    expect(result[0]).to.equal(c);
    result = col.remove([c, b]);
    expect(result.length).to.equal(1);
    expect(result[0]).to.equal(b);
    result = col.remove([]);
    expect(result).to.deep.equal([]);
  });

  it('add and remove return values', function () {
    var Even = class extends Backbone.Model {
      validate(attrs) {
        if (attrs.id % 2 !== 0) return 'odd';
      }
    };
    var collection = new Backbone.Collection();
    collection.model = Even;

    var list = collection.add([{ id: 2 }, { id: 4 }], { validate: true });
    expect(list.length).to.equal(2);
    expect(list[0]).to.be.instanceOf(Backbone.Model);
    expect(list[1]).to.equal(collection.last());
    expect(list[1].get('id')).to.equal(4);

    list = collection.add([{ id: 3 }, { id: 6 }], { validate: true });
    expect(collection.length).to.equal(3);
    expect(list[0]).to.be.false;
    expect(list[1].get('id')).to.equal(6);

    var result = collection.add({ id: 6 });
    expect(result.cid).to.equal(list[1].cid);

    result = collection.remove({ id: 6 });
    expect(collection.length).to.equal(2);
    expect(result.id).to.equal(6);

    list = collection.remove([{ id: 2 }, { id: 8 }]);
    expect(collection.length).to.equal(1);
    expect(list[0].get('id')).to.equal(2);
    expect(list[1]).to.be.undefined;
  });

  it('shift and pop', function () {
    var collection = new Backbone.Collection([{ a: 'a' }, { b: 'b' }, { c: 'c' }]);
    expect(collection.shift().get('a')).to.equal('a');
    expect(collection.pop().get('c')).to.equal('c');
  });

  it('slice', function () {
    var collection = new Backbone.Collection([{ a: 'a' }, { b: 'b' }, { c: 'c' }]);
    var array = collection.slice(1, 3);
    expect(array.length).to.equal(2);
    expect(array[0].get('b')).to.equal('b');
  });

  it('events are unbound on remove', function () {
    var counter = 0;
    var dj = new Backbone.Model();
    var emcees = new Backbone.Collection([dj]);
    emcees.on('change', function () {
      counter++;
    });
    dj.set({ name: 'Kool' });
    expect(counter).to.equal(1);
    emcees.reset([]);
    expect(dj.collection).to.equal(undefined);
    dj.set({ name: 'Shadow' });
    expect(counter).to.equal(1);
  });

  it('remove in multiple collections', function () {
    var modelData = {
      id: 5,
      title: 'Othello'
    };
    var passed = false;
    var m1 = new Backbone.Model(modelData);
    var m2 = new Backbone.Model(modelData);
    m2.on('remove', function () {
      passed = true;
    });
    var col1 = new Backbone.Collection([m1]);
    var col2 = new Backbone.Collection([m2]);
    expect(m1).to.not.equal(m2);
    expect(col1.length === 1).to.be.ok;
    expect(col2.length === 1).to.be.ok;
    col1.remove(m1);
    expect(passed).to.equal(false);
    expect(col1.length === 0).to.be.ok;
    col2.remove(m1);
    expect(col2.length === 0).to.be.ok;
    expect(passed).to.equal(true);
  });

  it('remove same model in multiple collection', function () {
    var counter = 0;
    var m = new Backbone.Model({ id: 5, title: 'Othello' });
    m.on('remove', function (model, collection) {
      counter++;
      expect(m).to.equal(model);
      if (counter > 1) {
        expect(collection).to.equal(col1);
      } else {
        expect(collection).to.equal(col2);
      }
    });
    var col1 = new Backbone.Collection([m]);
    col1.on('remove', function (model, collection) {
      expect(m).to.equal(model);
      expect(col1).to.equal(collection);
    });
    var col2 = new Backbone.Collection([m]);
    col2.on('remove', function (model, collection) {
      expect(m).to.equal(model);
      expect(col2).to.equal(collection);
    });
    expect(col1).to.equal(m.collection);
    col2.remove(m);
    expect(col2.length === 0).to.be.ok;
    expect(col1.length === 1).to.be.ok;
    expect(counter).to.equal(1);
    expect(col1).to.equal(m.collection);
    col1.remove(m);
    expect(m.collection).to.be.undefined;
    expect(col1.length === 0).to.be.ok;
    expect(counter).to.equal(2);
  });

  it('model destroy removes from all collections', function () {
    var m = new Backbone.Model({ id: 5, title: 'Othello' });
    m.sync = function (method, options) {
      options.success();
      return Promise.resolve();
    };
    var col1 = new Backbone.Collection([m]);
    var col2 = new Backbone.Collection([m]);
    m.destroy();
    expect(col1.length === 0).to.be.ok;
    expect(col2.length === 0).to.be.ok;
    expect(undefined).to.equal(m.collection);
  });

  it('Collection: non-persisted model destroy removes from all collections', function () {
    var m = new Backbone.Model({ title: 'Othello' });
    m.sync = function (method, options) {
      throw 'should not be called';
    };
    var col1 = new Backbone.Collection([m]);
    var col2 = new Backbone.Collection([m]);
    m.destroy();
    expect(col1.length === 0).to.be.ok;
    expect(col2.length === 0).to.be.ok;
    expect(undefined).to.equal(m.collection);
  });

  it('fetch', function () {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    collection.fetch();
    expect(syncArgs.method).to.equal('read');
    expect(syncArgs.model).to.equal(collection);
    expect(syncArgs.options.parse).to.equal(true);

    collection.fetch({ parse: false });
    expect(syncArgs.options.parse).to.equal(false);
  });

  it('fetch with an error response triggers an error event', function () {
    var collection = new Backbone.Collection();
    collection.on('error', function () {
      expect(true).to.be.ok;
    });
    collection.sync = function (method, options) {
      options.error();
      return Promise.resolve();
    };
    collection.fetch();
  });

  it('`fetch` promise should resolve after success callback', function (done) {
    var successCalled = false;
    var collection = new Backbone.Collection();
    collection.url = '/x';
    collection.fetch({ success: () => (successCalled = true) }).then(() => {
      expect(successCalled).to.be.ok;
      done();
    });
  });

  it('isLoading with successful fetch', function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var resolve;
    ajaxResponse = new Promise(function (res) {
      resolve = res;
    });
    var successCalled = false;
    collection.on('load', function () {
      expect(successCalled).to.equal(true);
      expect(collection.at(0).get('a')).to.equal(1);
    });
    expect(collection.isLoading).to.equal(false);
    collection
      .fetch({
        success() {
          expect(collection.isLoading).to.equal(false);
          successCalled = true;
        }
      })
      .then(function () {
        expect(collection.isLoading).to.equal(false);
        expect(successCalled).to.equal(true);
        done();
      });
    expect(collection.isLoading).to.equal(true);
    resolve([{ a: 1 }]);
  });

  it('isLoading with failed fetch', function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var reject;
    ajaxResponse = new Promise(function (res, rej) {
      reject = rej;
    });
    var errorCalled = false;
    collection.on('load', function () {
      expect(errorCalled).to.equal(true);
    });
    expect(collection.isLoading).to.equal(false);
    collection
      .fetch({
        error() {
          expect(collection.isLoading).to.equal(false);
          errorCalled = true;
        }
      })
    ['catch'](function () {
      expect(collection.isLoading).to.equal(false);
      expect(errorCalled).to.equal(true);
      done();
    });
    expect(collection.isLoading).to.equal(true);
    reject({ fail: true });
  });

  it('waitLoading with successful fetch', function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var resolve;
    ajaxResponse = new Promise(function (res) {
      resolve = res;
    });
    var loadCalled = false;
    var updateCalled = false;
    var fetchResolved = false;
    collection.on('load', function () {
      loadCalled = true;
    });
    collection.on('update', function () {
      updateCalled = true;
    });
    expect(collection.isLoading).to.equal(false);
    collection.fetch().then(function () {
      fetchResolved = true;
    });
    expect(collection.isLoading).to.equal(true);
    Backbone.waitLoading(collection).then(() => {
      expect(collection.isLoading).to.equal(false);
      expect(loadCalled).to.equal(true);
      expect(updateCalled).to.equal(true);
      expect(fetchResolved).to.equal(true);
      expect(collection.at(0).get('a')).to.equal(1);
      done();
    });
    resolve([{ a: 1 }]);
  });

  it('waitLoading with failed fetch', function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var reject;
    ajaxResponse = new Promise(function (res, rej) {
      reject = rej;
    });
    var loadCalled = false;
    var fetchResolved = false;
    collection.on('load', function () {
      loadCalled = true;
    });

    expect(collection.isLoading).to.equal(false);
    collection.fetch().catch(function () {
      fetchResolved = true;
    });

    expect(collection.isLoading).to.equal(true);
    Backbone.waitLoading(collection).then(() => {
      expect(collection.isLoading).to.equal(false);
      expect(loadCalled).to.equal(true);
      expect(fetchResolved).to.equal(true);
      done();
    });
    reject();
  });

  it('#3283 - fetch with an error response calls error with context', function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var obj = {};
    var options = {
      context: obj,
      error: function () {
        expect(this).to.equal(obj);
        done();
      }
    };
    ajaxResponse = Promise.reject();
    collection.fetch(options);
  });

  it('ensure fetch only parses once', function () {
    var collection = new Backbone.Collection();
    var counter = 0;
    collection.parse = function (models) {
      counter++;
      return models;
    };
    collection.url = '/test';
    collection.fetch();
    syncArgs.options.success([]);
    expect(counter).to.equal(1);
  });

  it('create', function () {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var model = collection.create({ label: 'f' }, { wait: true });
    expect(syncArgs.method).to.equal('create');
    expect(syncArgs.model).to.equal(model);
    expect(model.get('label')).to.equal('f');
    expect(model.collection).to.equal(collection);
  });

  it('create with validate:true enforces validation', function () {
    var ValidatingModel = class extends Backbone.Model {
      validate(attrs) {
        return 'fail';
      }
    };
    var ValidatingCollection = class extends Backbone.Collection {
      static model = ValidatingModel;
    };
    var collection = new ValidatingCollection();
    collection.on('invalid', function (coll, error, options) {
      expect(error).to.equal('fail');
    });
    expect(collection.create({ foo: 'bar' }, { validate: true })).to.equal(false);
  });

  it('create will pass extra options to success callback', function (done) {
    var Model = class extends Backbone.Model {
      sync(method, options) {
        _.extend(options, { specialSync: true });
        return super.sync(method, options);
      }
    };

    var Collection = class extends Backbone.Collection {
      static model = Model;
      url = '/test';
    };

    var collection = new Collection();

    var success = function (model, response, options) {
      expect(options.specialSync).to.be.ok;
      done();
    };

    collection.create({}, { success: success });
  });

  it('create with wait:true should not call collection.parse', function () {
    var Collection = class extends Backbone.Collection {
      url = '/test';
      parse() {
        expect.fail();
      }
    };

    var collection = new Collection();

    collection.create({}, { wait: true });
    ajaxSettings.success();
  });

  it('a failing create returns model with errors', function () {
    var ValidatingModel = class extends Backbone.Model {
      validate(attrs) {
        return 'fail';
      }
    };
    var ValidatingCollection = class extends Backbone.Collection {
      static model = ValidatingModel;
    };
    var collection = new ValidatingCollection();
    var m = collection.create({ foo: 'bar' });
    expect(m.validationError).to.equal('fail');
    expect(collection.length).to.equal(1);
  });

  it('initialize', function () {
    var Collection = class extends Backbone.Collection {
      initialize() {
        this.one = 1;
      }
    };
    var coll = new Collection();
    expect(coll.one).to.equal(1);
  });

  it('preinitialize', function () {
    var Collection = class extends Backbone.Collection {
      preinitialize() {
        this.one = 1;
      }
    };
    var coll = new Collection();
    expect(coll.one).to.equal(1);
  });

  it('preinitialize occurs before the collection is set up', function () {
    var Collection = class extends Backbone.Collection {
      preinitialize() {
        expect(this.model).to.not.equal(FooModel);
      }
    };
    var FooModel = class extends Backbone.Model {
      id = 'foo';
    };
    var coll = new Collection(
      {},
      {
        model: FooModel
      }
    );
    expect(coll.model).to.equal(FooModel);
  });

  it('toJSON', function () {
    expect(JSON.stringify(col)).to.equal(
      '[{"id":3,"label":"a"},{"id":2,"label":"b"},{"id":1,"label":"c"},{"id":0,"label":"d"}]'
    );
  });

  it('where and findWhere', function () {
    var model = new Backbone.Model({ a: 1 });
    var coll = new Backbone.Collection([model, { a: 1 }, { a: 1, b: 2 }, { a: 2, b: 2 }, { a: 3 }]);
    expect(coll.where({ a: 1 }).length).to.equal(3);
    expect(coll.where({ a: 2 }).length).to.equal(1);
    expect(coll.where({ a: 3 }).length).to.equal(1);
    expect(coll.where({ b: 1 }).length).to.equal(0);
    expect(coll.where({ b: 2 }).length).to.equal(2);
    expect(coll.where({ a: 1, b: 2 }).length).to.equal(1);
    expect(coll.findWhere({ a: 1 })).to.equal(model);
    expect(coll.findWhere({ a: 4 })).to.equal(void 0);
  });

  it('Underscore methods', function () {
    var labels = '';
    col.each(function (model) {
      labels = labels.concat(model.get('label'));
    });
    expect(labels).to.equal('abcd');
    expect(
      col
        .map(function (model) {
          return model.get('label');
        })
        .join(' ')
    ).to.equal('a b c d');
    expect(
      col.some(function (model) {
        return model.id === 100;
      })
    ).to.equal(false);
    expect(
      col.some(function (model) {
        return model.id === 0;
      })
    ).to.equal(true);
    expect(
      col.reduce(function (m1, m2) {
        return m1.id > m2.id ? m1 : m2;
      }).id
    ).to.equal(3);
    expect(
      col.reduceRight(function (m1, m2) {
        return m1.id > m2.id ? m1 : m2;
      }).id
    ).to.equal(3);
    expect(col.indexOf(b)).to.equal(1);
    expect(col.size()).to.equal(4);
    expect(col.drop().length).to.equal(3);
    expect(_.includes(col.drop(), a)).to.be.false;
    expect(_.includes(col.drop(), d)).to.be.true;
    expect(col.isEmpty()).to.be.false;
    expect(_.includes(col.without(d), d)).to.be.false;
    expect(col.difference([c, d])).to.deep.equal([a, b]);
    expect(col.includes(col.sample())).to.be.true;

    var first = col.first();
    expect(
      col.groupBy(function (model) {
        return model.id;
      })[first.id]
    ).to.deep.equal([first]);
    expect(
      col.countBy(function (model) {
        return model.id;
      })
    ).to.deep.equal({ 0: 1, 1: 1, 2: 1, 3: 1 });
    expect(
      col.sortBy(function (model) {
        return model.id;
      })[0]
    ).to.deep.equal(col.at(3));
  });

  it.skip('chain', function () {
    var wrapped = col.chain();
    expect(
      wrapped
        .map('id')
        .max()
        .value()
    ).to.equal(3);
    expect(
      wrapped
        .map('id')
        .min()
        .value()
    ).to.equal(0);
    expect(
      wrapped
        .filter(function (o) {
          return o.id % 2 === 0;
        })
        .map(function (o) {
          return o.id * 2;
        })
        .value()
    ).to.deep.equal([4, 0]);
  });

  it('Underscore methods with object-style and property-style iteratee', function () {
    var model = new Backbone.Model({ a: 4, b: 1, e: 3 });
    var coll = new Backbone.Collection([
      { a: 1, b: 1 },
      { a: 2, b: 1, c: 1 },
      { a: 3, b: 1 },
      model
    ]);
    expect(coll.find({ a: 0 })).to.equal(undefined);
    expect(coll.find({ a: 4 })).to.deep.equal(model);
    expect(coll.find('d')).to.equal(undefined);
    expect(coll.find('e')).to.deep.equal(model);
    expect(coll.filter({ a: 0 })).to.deep.equal([]);
    expect(coll.filter({ a: 4 })).to.deep.equal([model]);
    expect(coll.some({ a: 0 })).to.equal(false);
    expect(coll.some({ a: 1 })).to.equal(true);
    expect(coll.reject({ a: 0 }).length).to.equal(4);
    expect(coll.reject({ a: 4 })).to.deep.equal(_.without(coll.models, model));
    expect(coll.every({ a: 0 })).to.equal(false);
    expect(coll.every({ b: 1 })).to.equal(true);
    expect(coll.partition({ a: 0 })[0]).to.deep.equal([]);
    expect(coll.partition({ a: 0 })[1]).to.deep.equal(coll.models);
    expect(coll.partition({ a: 4 })[0]).to.deep.equal([model]);
    expect(coll.partition({ a: 4 })[1]).to.deep.equal(_.without(coll.models, model));
    expect(coll.map({ a: 2 })).to.deep.equal([false, true, false, false]);
    expect(coll.map('a')).to.deep.equal([1, 2, 3, 4]);
    expect(coll.sortBy('a')[3]).to.deep.equal(model);
    expect(coll.sortBy('e')[0]).to.deep.equal(model);
    expect(coll.countBy({ a: 4 })).to.deep.equal({ false: 3, true: 1 });
    expect(coll.countBy('d')).to.deep.equal({ undefined: 4 });
    expect(coll.findIndex({ b: 1 })).to.equal(0);
    expect(coll.findIndex({ b: 9 })).to.equal(-1);
    expect(coll.findLastIndex({ b: 1 })).to.equal(3);
    expect(coll.findLastIndex({ b: 9 })).to.equal(-1);
  });

  it('reset', function () {
    var resetCount = 0;
    var models = col.models;
    col.on('reset', function () {
      resetCount += 1;
    });
    col.reset([]);
    expect(resetCount).to.equal(1);
    expect(col.length).to.equal(0);
    expect(col.last()).to.equal(undefined);
    col.reset(models);
    expect(resetCount).to.equal(2);
    expect(col.length).to.equal(4);
    expect(col.last()).to.equal(d);
    col.reset(
      _.map(models, function (m) {
        return m.attributes;
      })
    );
    expect(resetCount).to.equal(3);
    expect(col.length).to.equal(4);
    expect(col.last()).to.not.equal(d);
    expect(_.isEqual(col.last().attributes, d.attributes)).to.be.true;
    col.reset();
    expect(col.length).to.equal(0);
    expect(resetCount).to.equal(4);

    var f = new Backbone.Model({ id: 20, label: 'f' });
    col.reset([undefined, f]);
    expect(col.length).to.equal(2);
    expect(resetCount).to.equal(5);

    col.reset(new Array(4));
    expect(col.length).to.equal(4);
    expect(resetCount).to.equal(6);
  });

  it('reset with different values', function () {
    var collection = new Backbone.Collection({ id: 1 });
    collection.reset({ id: 1, a: 1 });
    expect(collection.get(1).get('a')).to.equal(1);
  });

  it('same references in reset', function () {
    var model = new Backbone.Model({ id: 1 });
    var collection = new Backbone.Collection({ id: 1 });
    collection.reset(model);
    expect(collection.get(1)).to.equal(model);
  });

  it('reset passes caller options', function () {
    var Model = class extends Backbone.Model {
      initialize(attrs, options) {
        this.modelParameter = options.modelParameter;
      }
    };
    var collection = new class extends Backbone.Collection {
      static model = Model;
    }();
    collection.reset([{ astring: 'green', anumber: 1 }, { astring: 'blue', anumber: 2 }], {
      modelParameter: 'model parameter'
    });
    expect(collection.length).to.equal(2);
    collection.each(function (model) {
      expect(model.modelParameter).to.equal('model parameter');
    });
  });

  it('reset does not alter options by reference', function () {
    var collection = new Backbone.Collection([{ id: 1 }]);
    var origOpts = {};
    collection.on('reset', function (coll, opts) {
      expect(origOpts.previousModels).to.equal(undefined);
      expect(opts.previousModels[0].id).to.equal(1);
    });
    collection.reset([], origOpts);
  });

  it('trigger custom events on models', function () {
    var fired = null;
    a.on('custom', function () {
      fired = true;
    });
    a.trigger('custom');
    expect(fired).to.equal(true);
  });

  it('add does not alter arguments', function () {
    var attrs = {};
    var models = [attrs];
    new Backbone.Collection().add(models);
    expect(models.length).to.equal(1);
    expect(attrs === models[0]).to.be.true;
  });

  it('#714: access `model.collection` in a brand new model.', function () {
    var collection = new Backbone.Collection();
    collection.url = '/test';
    var Model = class extends Backbone.Model {
      set(attrs) {
        expect(attrs.prop).to.equal('value');
        expect(this.collection).to.equal(collection);
        return this;
      }
    };
    collection.model = Model;
    collection.create({ prop: 'value' });
  });

  it('#574, remove its own reference to the .models array.', function () {
    var collection = new Backbone.Collection([
      { id: 1 },
      { id: 2 },
      { id: 3 },
      { id: 4 },
      { id: 5 },
      { id: 6 }
    ]);
    expect(collection.length).to.equal(6);
    collection.remove(collection.models);
    expect(collection.length).to.equal(0);
  });

  it('#861, adding models to a collection which do not pass validation, with validate:true', function () {
    var Model = class extends Backbone.Model {
      validate(attrs) {
        if (attrs.id === 3) return "id can't be 3";
      }
    };

    var Collection = class extends Backbone.Collection {
      static model = Model;
    };

    var collection = new Collection();
    collection.on('invalid', function () {
      expect(true).to.be.true;
    });

    collection.add([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }, { id: 6 }], {
      validate: true
    });
    expect(collection.pluck('id')).to.deep.equal([1, 2, 4, 5, 6]);
  });

  it('Invalid models are discarded with validate:true.', function () {
    var collection = new Backbone.Collection();
    collection.on('test', function () {
      expect(true).to.be.true;
    });
    collection.model = class extends Backbone.Model {
      validate(attrs) {
        if (!attrs.valid) return 'invalid';
      }
    };
    var model = new collection.model({ id: 1, valid: true });
    collection.add([model, { id: 2 }], { validate: true });
    model.trigger('test');
    expect(collection.get(model.cid)).to.be.ok;
    expect(collection.get(1)).to.be.ok;
    expect(collection.get(2)).to.not.be.ok;
    expect(collection.length).to.equal(1);
  });

  it('multiple copies of the same model', function () {
    var collection = new Backbone.Collection();
    var model = new Backbone.Model();
    collection.add([model, model]);
    expect(collection.length).to.equal(1);
    collection.add([{ id: 1 }, { id: 1 }]);
    expect(collection.length).to.equal(2);
    expect(collection.last().id).to.equal(1);
  });

  it('#964 - collection.get return inconsistent', function () {
    var collection = new Backbone.Collection();
    expect(collection.get(null)).to.equal(undefined);
    expect(collection.get()).to.equal(undefined);
  });

  it('#1112 - passing options.model sets collection.model', function () {
    var Model = class extends Backbone.Model { };
    var collection = new Backbone.Collection([{ id: 1 }], { model: Model });
    expect(collection.model === Model).to.be.true;
    expect(collection.at(0) instanceof Model).to.be.true;
  });

  it('null and undefined are invalid ids.', function () {
    var model = new Backbone.Model({ id: 1 });
    var collection = new Backbone.Collection([model]);
    model.set({ id: null });
    expect(collection.get('null')).to.not.be.ok;
    model.set({ id: 1 });
    model.set({ id: undefined });
    expect(collection.get('undefined')).to.not.be.ok;
  });

  it('falsy comparator', function () {
    var Col = class extends Backbone.Collection {
      comparator(model) {
        return model.id;
      }
    };
    var collection = new Col();
    var colFalse = new Col(null, { comparator: false });
    var colNull = new Col(null, { comparator: null });
    var colUndefined = new Col(null, { comparator: undefined });
    expect(collection.comparator).to.be.ok;
    expect(colFalse.comparator).to.not.be.ok;
    expect(colNull.comparator).to.not.be.ok;
    expect(colUndefined.comparator).to.be.ok;
  });

  it('#1355 - `options` is passed to success callbacks', function (done) {
    var m = new Backbone.Model({ x: 1 });
    var collection = new Backbone.Collection();
    m.url = collection.url = '/test';
    var opts = {
      opts: true,
      success: function (coll, resp, options) {
        expect(options.opts).to.be.true;
      }
    };

    Promise.all([collection.fetch(opts), collection.create(m, opts)]).then(function () {
      done();
    });
  });

  it("#1412 - Trigger 'request' and 'sync' events on create.", function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';

    collection.on('request', function (obj, xhr, options) {
      expect(obj === collection.get(1)).to.be.true;
    });
    collection.on('sync', function (obj, response, options) {
      expect(obj === collection.get(1)).to.be.true;
      collection.off();
      done();
    });
    collection.create({ id: 1 });
  });

  it("#1412 - Trigger 'request' and 'sync' events on fetch.", function (done) {
    var collection = new Backbone.Collection();
    collection.url = '/test';

    collection.on('request', function (obj, xhr, options) {
      expect(obj === collection).to.be.true;
    });
    collection.on('sync', function (obj, response, options) {
      expect(obj === collection).to.be.true;
      collection.off();
      done();
    });
    collection.fetch();
  });

  it('#3283 - fetch, create calls success with context', function (done) {
    var count = 0;
    var collection = new Backbone.Collection();
    collection.url = '/test';

    var obj = {};
    var options = {
      context: obj,
      success: function () {
        expect(this).to.equal(obj);
        count++;
        if (count === 2) {
          done();
        }
      }
    };

    collection.fetch(options);
    collection.create({ id: 1 }, options);
  });

  it('#1447 - create with wait adds model.', function () {
    var collection = new Backbone.Collection();
    var model = new Backbone.Model();
    model.sync = async function (method, options) {
      options.success();
    };
    collection.on('add', function () {
      expect(true).to.be.true;
    });
    collection.create(model, { wait: true });
  });

  it('#1448 - add sorts collection after merge.', function () {
    var collection = new Backbone.Collection([{ id: 1, x: 1 }, { id: 2, x: 2 }]);
    collection.comparator = function (model) {
      return model.get('x');
    };
    collection.add({ id: 1, x: 3 }, { merge: true });
    expect(collection.pluck('id')).to.deep.equal([2, 1]);
  });

  it('#1655 - groupBy can be used with a string argument.', function () {
    var collection = new Backbone.Collection([{ x: 1 }, { x: 2 }]);
    var grouped = collection.groupBy('x');
    expect(_.keys(grouped).length).to.equal(2);
    expect(grouped[1][0].get('x')).to.equal(1);
    expect(grouped[2][0].get('x')).to.equal(2);
  });

  it('#1655 - sortBy can be used with a string argument.', function () {
    var collection = new Backbone.Collection([{ x: 3 }, { x: 1 }, { x: 2 }]);
    var values = _.map(collection.sortBy('x'), function (model) {
      return model.get('x');
    });
    expect(values).to.deep.equal([1, 2, 3]);
  });

  it('#1604 - Removal during iteration.', function () {
    var collection = new Backbone.Collection([{}, {}]);
    collection.on('add', function () {
      collection.at(0).destroy();
    });
    collection.add({}, { at: 0 });
  });

  it('#1638 - `sort` during `add` triggers correctly.', function () {
    var collection = new Backbone.Collection();
    collection.comparator = function (model) {
      return model.get('x');
    };
    var added = [];
    collection.on('add', function (model) {
      model.set({ x: 3 });
      collection.sort();
      added.push(model.id);
    });
    collection.add([{ id: 1, x: 1 }, { id: 2, x: 2 }]);
    expect(added).to.deep.equal([1, 2]);
  });

  it('fetch parses models by default', function () {
    var model = {};
    var Collection = class extends Backbone.Collection {
      url = 'test';
      static model = class extends Backbone.Model {
        parse(resp) {
          expect(resp).to.equal(model);
        }
      };
    };
    new Collection().fetch();
    ajaxSettings.success([model]);
  });

  it("`sort` shouldn't always fire on `add`", function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }, { id: 3 }], {
      comparator: 'id'
    });
    collection.sort = function () {
      expect(true).to.be.true;
    };
    collection.add([]);
    collection.add({ id: 1 });
    collection.add([{ id: 2 }, { id: 3 }]);
    collection.add({ id: 4 });
  });

  it('#1407 parse option on constructor parses collection and models', function () {
    var model = {
      namespace: [{ id: 1 }, { id: 2 }]
    };
    var Collection = class extends Backbone.Collection {
      static model = class extends Backbone.Model {
        parse(m) {
          m.name = 'test';
          return m;
        }
      };
      parse(m) {
        return m.namespace;
      }
    };
    var collection = new Collection(model, { parse: true });

    expect(collection.length).to.equal(2);
    expect(collection.at(0).get('name')).to.equal('test');
  });

  it('#1407 parse option on reset parses collection and models', function () {
    var model = {
      namespace: [{ id: 1 }, { id: 2 }]
    };
    var Collection = class extends Backbone.Collection {
      static model = class extends Backbone.Model {
        parse(m) {
          m.name = 'test';
          return m;
        }
      };
      parse(m) {
        return m.namespace;
      }
    };
    var collection = new Collection();
    collection.reset(model, { parse: true });

    expect(collection.length).to.equal(2);
    expect(collection.at(0).get('name')).to.equal('test');
  });

  it('Reset includes previous models in triggered event.', function () {
    var model = new Backbone.Model();
    var collection = new Backbone.Collection([model]);
    collection.on('reset', function (coll, options) {
      expect(options.previousModels).to.deep.equal([model]);
    });
    collection.reset([]);
  });

  it('set', function () {
    var m1 = new Backbone.Model();
    var m2 = new Backbone.Model({ id: 2 });
    var m3 = new Backbone.Model();
    var collection = new Backbone.Collection([m1, m2]);

    // Test add/change/remove events
    collection.on('add', function (model) {
      expect(model).to.equal(m3);
    });
    collection.on('change', function (model) {
      expect(model).to.equal(m2);
    });
    collection.on('remove', function (model) {
      expect(model).to.equal(m1);
    });

    // remove: false doesn't remove any models
    collection.set([], { remove: false });
    expect(collection.length).to.equal(2);

    // add: false doesn't add any models
    collection.set([m1, m2, m3], { add: false });
    expect(collection.length).to.equal(2);

    // merge: false doesn't change any models
    collection.set([m1, { id: 2, a: 1 }], { merge: false });
    expect(m2.get('a')).to.equal(void 0);

    // add: false, remove: false only merges existing models
    collection.set([m1, { id: 2, a: 0 }, m3, { id: 4 }], {
      add: false,
      remove: false
    });
    expect(collection.length).to.equal(2);
    expect(m2.get('a')).to.equal(0);

    // default options add/remove/merge as appropriate
    collection.set([{ id: 2, a: 1 }, m3]);
    expect(collection.length).to.equal(2);
    expect(m2.get('a')).to.equal(1);

    // Test removing models not passing an argument
    collection.off('remove').on('remove', function (model) {
      expect(model === m2 || model === m3).to.be.true;
    });
    collection.set([]);
    expect(collection.length).to.equal(0);

    // Test null models on set doesn't clear collection
    collection.off();
    collection.set([{ id: 1 }]);
    collection.set();
    expect(collection.length).to.equal(1);
  });

  it('set with only cids', function () {
    var m1 = new Backbone.Model();
    var m2 = new Backbone.Model();
    var collection = new Backbone.Collection();
    collection.set([m1, m2]);
    expect(collection.length).to.equal(2);
    collection.set([m1]);
    expect(collection.length).to.equal(1);
    collection.set([m1, m1, m1, m2, m2], { remove: false });
    expect(collection.length).to.equal(2);
  });

  it('set with only idAttribute', function () {
    var m1 = { _id: 1 };
    var m2 = { _id: 2 };
    var Col = class extends Backbone.Collection {
      static model = class extends Backbone.Model {
        static idAttribute = '_id';
      };
    };
    var collection = new Col();
    collection.set([m1, m2]);
    expect(collection.length).to.equal(2);
    collection.set([m1]);
    expect(collection.length).to.equal(1);
    collection.set([m1, m1, m1, m2, m2], { remove: false });
    expect(collection.length).to.equal(2);
  });

  it('set + merge with default values defined', function () {
    var Model = class extends Backbone.Model {
      defaults() {
        return {
          key: 'value'
        };
      }
    };
    var m = new Model({ id: 1 });
    var collection = new Backbone.Collection([m], { model: Model });
    expect(collection.first().get('key')).to.equal('value');

    collection.set({ id: 1, key: 'other' });
    expect(collection.first().get('key')).to.equal('other');

    collection.set({ id: 1, other: 'value' });
    expect(collection.first().get('key')).to.equal('other');
    expect(collection.length).to.equal(1);
  });

  it('merge without mutation', function () {
    var Model = class extends Backbone.Model {
      initialize(attrs, options) {
        if (attrs.child) {
          this.set('child', new Model(attrs.child, options), options);
        }
      }
    };
    var Collection = class extends Backbone.Collection {
      static model = Model;
    };
    var data = [{ id: 1, child: { id: 2 } }];
    var collection = new Collection(data);
    expect(collection.first().id).to.equal(1);
    collection.set(data);
    expect(collection.first().id).to.equal(1);
    collection.set([{ id: 2, child: { id: 2 } }].concat(data));
    expect(collection.pluck('id')).to.deep.equal([2, 1]);
  });

  it('`set` and model level `parse`', function () {
    var Model = class extends Backbone.Model { };
    var Collection = class extends Backbone.Collection {
      static model = Model;
      parse(res) {
        return _.map(res.models, 'model');
      }
    };
    var model = new Model({ id: 1 });
    var collection = new Collection(model);
    collection.set({ models: [{ model: { id: 1 } }, { model: { id: 2 } }] }, { parse: true });
    expect(collection.first()).to.equal(model);
  });

  it('`set` data is only parsed once', function () {
    var collection = new Backbone.Collection();
    collection.model = class extends Backbone.Model {
      parse(data) {
        expect(data.parsed).to.equal(void 0);
        data.parsed = true;
        return data;
      }
    };
    collection.set({}, { parse: true });
  });

  it('`set` matches input order in the absence of a comparator', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    collection.set([{ id: 3 }, { id: 2 }, { id: 1 }]);
    expect(collection.models).to.deep.equal([three, two, one]);
    collection.set([{ id: 1 }, { id: 2 }]);
    expect(collection.models).to.deep.equal([one, two]);
    collection.set([two, three, one]);
    expect(collection.models).to.deep.equal([two, three, one]);
    collection.set([{ id: 1 }, { id: 2 }], { remove: false });
    expect(collection.models).to.deep.equal([two, three, one]);
    collection.set([{ id: 1 }, { id: 2 }, { id: 3 }], { merge: false });
    expect(collection.models).to.deep.equal([one, two, three]);
    collection.set([three, two, one, { id: 4 }], { add: false });
    expect(collection.models).to.deep.equal([one, two, three]);
  });

  it('#1894 - Push should not trigger a sort', function () {
    var Collection = class extends Backbone.Collection {
      comparator = 'id';
      sort() {
        expect(false).to.be.true;
      }
    };
    new Collection().push({ id: 1 });
  });

  it('#2428 - push duplicate models, return the correct one', function () {
    var collection = new Backbone.Collection();
    var model1 = collection.push({ id: 101 });
    var model2 = collection.push({ id: 101 });
    expect(model2.cid === model1.cid).to.be.true;
  });

  it('`set` with non-normal id', function () {
    var Collection = class extends Backbone.Collection {
      static model = class extends Backbone.Model {
        static idAttribute = '_id';
      };
    };
    var collection = new Collection({ _id: 1 });
    collection.set([{ _id: 1, a: 1 }], { add: false });
    expect(collection.first().get('a')).to.equal(1);
  });

  it('#1894 - `sort` can optionally be turned off', function () {
    var Collection = class extends Backbone.Collection {
      comparator = 'id';
      sort() {
        expect(false).to.be.true;
      }
    };
    new Collection().add({ id: 1 }, { sort: false });
  });

  it('#1915 - `parse` data in the right order in `set`', function () {
    var collection = new class extends Backbone.Collection {
      parse(data) {
        expect(data.status).to.equal('ok');
        return data.data;
      }
    }();
    var res = { status: 'ok', data: [{ id: 1 }] };
    collection.set(res, { parse: true });
  });

  it('#1939 - `parse` is passed `options`', function (done) {
    var collection = new class extends Backbone.Collection {
      url = '/';
      parse(data, options) {
        expect(options.xhr.someHeader).to.equal('headerValue');
        return data;
      }
    }();
    var ajax = Backbone.ajax.handler;
    Backbone.ajax.handler = function (params) {
      var promise = Promise.resolve([]);
      promise.someHeader = 'headerValue';
      return promise;
    };
    collection.fetch({
      success: function () {
        done();
      }
    });
    Backbone.ajax.handler = ajax;
  });

  it('fetch will pass extra options to success callback', function (done) {
    var SpecialSyncCollection = class extends Backbone.Collection {
      url = '/test';
      sync(method, options) {
        _.extend(options, { specialSync: true });
        return super.sync(method, options);
      }
    };

    var collection = new SpecialSyncCollection();

    var onSuccess = function (coll, resp, options) {
      expect(options.specialSync).to.be.true;
      done();
    };

    collection.fetch({ success: onSuccess });
  });

  it('customized sync', function (done) {
    var collection;
    var SpecialSyncCollection = class extends Backbone.Collection {
      url = '/test';

      sync(method, options) {
        expect(this).to.equal(collection);
        expect(method).to.equal('read');
        return Promise.resolve([{ x: 'y' }]);
      }
    };

    collection = new SpecialSyncCollection();

    var onSuccess = function (coll, resp, options) {
      expect(resp).to.deep.equal([{ x: 'y' }]);
      done();
    };

    collection.fetch({ success: onSuccess });
  });

  it('`add` only `sort`s when necessary', function () {
    var collection = new class extends Backbone.Collection {
      comparator = 'a';
    }([{ id: 1 }, { id: 2 }, { id: 3 }]);
    collection.on('sort', function () {
      expect(true).to.be.true;
    });
    collection.add({ id: 4 }); // do sort, new model
    collection.add({ id: 1, a: 1 }, { merge: true }); // do sort, comparator change
    collection.add({ id: 1, b: 1 }, { merge: true }); // don't sort, no comparator change
    collection.add({ id: 1, a: 1 }, { merge: true }); // don't sort, no comparator change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, { merge: true }); // don't sort
  });

  it('`add` only `sort`s when necessary with comparator function', function () {
    var collection = new class extends Backbone.Collection {
      comparator(m1, m2) {
        return m1.get('a') > m2.get('a') ? 1 : m1.get('a') < m2.get('a') ? -1 : 0;
      }
    }([{ id: 1 }, { id: 2 }, { id: 3 }]);
    collection.on('sort', function () {
      expect(true).to.be.true;
    });
    collection.add({ id: 4 }); // do sort, new model
    collection.add({ id: 1, a: 1 }, { merge: true }); // do sort, model change
    collection.add({ id: 1, b: 1 }, { merge: true }); // do sort, model change
    collection.add({ id: 1, a: 1 }, { merge: true }); // don't sort, no model change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, { merge: true }); // don't sort
  });

  it('Attach options to collection.', function () {
    var Model = Backbone.Model;
    var comparator = function () { };

    var collection = new Backbone.Collection([], {
      model: Model,
      comparator: comparator
    });

    expect(collection.model === Model).to.be.true;
    expect(collection.comparator === comparator).to.be.true;
  });

  it('Pass falsey for `models` for empty Col with `options`', function () {
    var opts = { a: 1, b: 2 };
    _.forEach([undefined, null, false], function (falsey) {
      var Collection = class extends Backbone.Collection {
        initialize(models, options) {
          expect(models).to.equal(falsey);
          expect(options).to.equal(opts);
        }
      };

      var collection = new Collection(falsey, opts);
      expect(collection.length).to.equal(0);
    });
  });

  it('`add` overrides `set` flags', function () {
    var collection = new Backbone.Collection();
    collection.once('add', function (model, coll, options) {
      coll.add({ id: 2 }, options);
    });
    collection.set({ id: 1 });
    expect(collection.length).to.equal(2);
  });

  it('#2606 - Collection#create, success arguments', function (done) {
    var collection = new Backbone.Collection();
    ajaxResponse = 'response';
    collection.url = 'test';
    collection.create(
      {},
      {
        success: function (model, resp, options) {
          expect(resp).to.equal('response');
          done();
        }
      }
    );
  });

  it('#2612 - nested `parse` works with `Collection#set`', function () {
    var Job = class extends Backbone.Model {
      preinitialize() {
        this.items = new Items();
      }
      parse(attrs) {
        this.items.set(attrs.items, { parse: true });
        return _.omit(attrs, 'items');
      }
    };

    var Item = class extends Backbone.Model {
      preinitialize() {
        this.subItems = new Backbone.Collection();
      }
      parse(attrs) {
        this.subItems.set(attrs.subItems, { parse: true });
        return _.omit(attrs, 'subItems');
      }
    };

    var Items = class extends Backbone.Collection {
      static model = Item;
    };

    var data = {
      name: 'JobName',
      id: 1,
      items: [
        {
          id: 1,
          name: 'Sub1',
          subItems: [{ id: 1, subName: 'One' }, { id: 2, subName: 'Two' }]
        },
        {
          id: 2,
          name: 'Sub2',
          subItems: [{ id: 3, subName: 'Three' }, { id: 4, subName: 'Four' }]
        }
      ]
    };

    var newData = {
      name: 'NewJobName',
      id: 1,
      items: [
        {
          id: 1,
          name: 'NewSub1',
          subItems: [{ id: 1, subName: 'NewOne' }, { id: 2, subName: 'NewTwo' }]
        },
        {
          id: 2,
          name: 'NewSub2',
          subItems: [{ id: 3, subName: 'NewThree' }, { id: 4, subName: 'NewFour' }]
        }
      ]
    };

    var job = new Job(data, { parse: true });
    expect(job.get('name')).to.equal('JobName');
    expect(job.items.at(0).get('name')).to.equal('Sub1');
    expect(job.items.length).to.equal(2);
    expect(
      job.items
        .get(1)
        .subItems.get(1)
        .get('subName')
    ).to.equal('One');
    expect(
      job.items
        .get(2)
        .subItems.get(3)
        .get('subName')
    ).to.equal('Three');
    job.set(job.parse(newData, { parse: true }));
    expect(job.get('name')).to.equal('NewJobName');
    expect(job.items.at(0).get('name')).to.equal('NewSub1');
    expect(job.items.length).to.equal(2);
    expect(
      job.items
        .get(1)
        .subItems.get(1)
        .get('subName')
    ).to.equal('NewOne');
    expect(
      job.items
        .get(2)
        .subItems.get(3)
        .get('subName')
    ).to.equal('NewThree');
  });

  it('_addReference binds all collection events & adds to the lookup hashes', function () {
    var calls = { add: 0, remove: 0 };

    var Collection = class extends Backbone.Collection {
      _addReference(model) {
        Backbone.Collection.prototype._addReference.apply(this, arguments);
        calls.add++;
        expect(model).to.equal(this._byId[model.id]);
        expect(model).to.equal(this._byId[model.cid]);
        expect(model._events.all.length).to.equal(1);
      }

      _removeReference(model) {
        Backbone.Collection.prototype._removeReference.apply(this, arguments);
        calls.remove++;
        expect(this._byId[model.id]).to.equal(void 0);
        expect(this._byId[model.cid]).to.equal(void 0);
        expect(model.collection).to.equal(void 0);
      }
    };

    var collection = new Collection();
    var model = collection.add({ id: 1 });
    collection.remove(model);

    expect(calls.add).to.equal(1);
    expect(calls.remove).to.equal(1);
  });

  it('Do not allow duplicate models to be `add`ed or `set`', function () {
    var collection = new Backbone.Collection();

    collection.add([{ id: 1 }, { id: 1 }]);
    expect(collection.length).to.equal(1);
    expect(collection.models.length).to.equal(1);

    collection.set([{ id: 1 }, { id: 1 }]);
    expect(collection.length).to.equal(1);
    expect(collection.models.length).to.equal(1);
  });

  it('#3020: #set with {add: false} should not throw.', function () {
    var collection = new Backbone.Collection();
    collection.set([{ id: 1 }], { add: false });
    expect(collection.length).to.equal(0);
    expect(collection.models.length).to.equal(0);
  });

  it('create with wait, model instance, #3028', function () {
    var collection = new Backbone.Collection();
    var model = new Backbone.Model({ id: 1 });
    model.sync = async function () {
      expect(this.collection).to.equal(collection);
    };
    collection.create(model, { wait: true });
  });

  it('modelId', function () {
    var Stooge = class extends Backbone.Model { };
    var StoogeCollection = class extends Backbone.Collection {
      static model = Stooge;
    };

    // Default to using `Collection::model::idAttribute`.
    expect(StoogeCollection.prototype.modelId({ id: 1 })).to.equal(1);
    Stooge.idAttribute = '_id';
    expect(StoogeCollection.prototype.modelId({ _id: 1 })).to.equal(1);
  });

  it('Polymorphic models work with "simple" constructors', function () {
    var A = class extends Backbone.Model { };
    var B = class extends Backbone.Model { };
    var C = class extends Backbone.Collection {
      model(attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }
    };
    var collection = new C([{ id: 1, type: 'a' }, { id: 2, type: 'b' }]);
    expect(collection.length).to.equal(2);
    expect(collection.at(0) instanceof A).to.be.true;
    expect(collection.at(0).id).to.equal(1);
    expect(collection.at(1) instanceof B).to.be.true;
    expect(collection.at(1).id).to.equal(2);
  });

  it('Polymorphic models work with "advanced" constructors', function () {
    var A = class extends Backbone.Model {
      static idAttribute = '_id';
    };
    var B = class extends Backbone.Model {
      static idAttribute = '_id';
    };
    var C = class extends Backbone.Collection {
      static model = class extends Backbone.Model {
        constructor(attrs) {
          return attrs.type === 'a' ? new A(attrs) : new B(attrs);
        }

        static idAttribute = '_id';
      };
    };
    var collection = new C([{ _id: 1, type: 'a' }, { _id: 2, type: 'b' }]);
    expect(collection.length).to.equal(2);
    expect(collection.at(0) instanceof A).to.be.true;
    expect(collection.at(0)).to.equal(collection.get(1));
    expect(collection.at(1) instanceof B).to.be.true;
    expect(collection.at(1)).to.equal(collection.get(2));

    C = class extends Backbone.Collection {
      model(attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }

      modelId(attrs) {
        return attrs.type + '-' + attrs.id;
      }
    };
    collection = new C([{ id: 1, type: 'a' }, { id: 1, type: 'b' }]);
    expect(collection.length).to.equal(2);
    expect(collection.at(0) instanceof A).to.be.true;
    expect(collection.at(0)).to.equal(collection.get('a-1'));
    expect(collection.at(1) instanceof B).to.be.true;
    expect(collection.at(1)).to.equal(collection.get('b-1'));
  });

  it('Collection with polymorphic models receives default id from modelId', function () {
    // When the polymorphic models use 'id' for the idAttribute, all is fine.
    var C1 = class extends Backbone.Collection {
      model(attrs) {
        return new Backbone.Model(attrs);
      }
    };
    var c1 = new C1({ id: 1 });
    expect(c1.get(1).id).to.equal(1);
    expect(c1.modelId({ id: 1 })).to.equal(1);

    // If the polymorphic models define their own idAttribute,
    // the modelId method should be overridden, for the reason below.
    var M = class extends Backbone.Model {
      static idAttribute = '_id';
    };
    var C2 = class extends Backbone.Collection {
      model(attrs) {
        return new M(attrs);
      }
    };
    var c2 = new C2({ _id: 1 });
    expect(c2.get(1)).to.equal(void 0);
    expect(c2.modelId(c2.at(0).attributes)).to.equal(void 0);
    var m = new M({ _id: 2 });
    c2.add(m);
    expect(c2.get(2)).to.equal(void 0);
    expect(c2.modelId(m.attributes)).to.equal(void 0);
  });

  it('Collection implements Iterable, values is default iterator function', function () {
    var $$iterator = Symbol.iterator;
    // This test only applies to environments which define Symbol.iterator.
    if (!$$iterator) {
      return;
    }
    var collection = new Backbone.Collection([]);
    var iterator = collection[$$iterator]();
    expect(iterator.next()).to.deep.equal({ value: void 0, done: true });
  });

  it('Collection.values iterates models in sorted order', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    var iterator = collection.values();
    expect(iterator.next().value).to.equal(one);
    expect(iterator.next().value).to.equal(two);
    expect(iterator.next().value).to.equal(three);
    expect(iterator.next().value).to.equal(void 0);
  });

  it('Collection.keys iterates ids in sorted order', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    var iterator = collection.keys();
    expect(iterator.next().value).to.equal(1);
    expect(iterator.next().value).to.equal(2);
    expect(iterator.next().value).to.equal(3);
    expect(iterator.next().value).to.equal(void 0);
  });

  it('Collection.entries iterates ids and models in sorted order', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    var iterator = collection.entries();
    expect(iterator.next().value).to.deep.equal([1, one]);
    expect(iterator.next().value).to.deep.equal([2, two]);
    expect(iterator.next().value).to.deep.equal([3, three]);
    expect(iterator.next().value).to.equal(void 0);
  });

  it('#3039 #3951: adding at index fires with correct at', function () {
    var collection = new Backbone.Collection([{ val: 0 }, { val: 4 }]);
    collection.on('add', function (model, coll, options) {
      expect(model.get('val')).to.equal(options.index);
    });
    collection.add([{ val: 1 }, { val: 2 }, { val: 3 }], { at: 1 });
    collection.add({ val: 5 }, { at: 10 });
  });

  it('#3039: index is not sent when at is not specified', function () {
    var collection = new Backbone.Collection([{ at: 0 }]);
    collection.on('add', function (model, coll, options) {
      expect(options.index).to.equal(undefined);
    });
    collection.add([{ at: 1 }, { at: 2 }]);
  });

  it('#3199 - Order changing should trigger a sort', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    collection.on('sort', function () {
      expect(true).to.be.true;
    });
    collection.set([{ id: 3 }, { id: 2 }, { id: 1 }]);
  });

  it('#3199 - Adding a model should trigger a sort', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    collection.on('sort', function () {
      expect(true).to.be.true;
    });
    collection.set([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 0 }]);
  });

  it('#3199 - Order not changing should not trigger a sort', function () {
    var one = new Backbone.Model({ id: 1 });
    var two = new Backbone.Model({ id: 2 });
    var three = new Backbone.Model({ id: 3 });
    var collection = new Backbone.Collection([one, two, three]);
    collection.on('sort', function () {
      expect(false).to.be.true;
    });
    collection.set([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('add supports negative indexes', function () {
    var collection = new Backbone.Collection([{ id: 1 }]);
    collection.add([{ id: 2 }, { id: 3 }], { at: -1 });
    collection.add([{ id: 2.5 }], { at: -2 });
    collection.add([{ id: 0.5 }], { at: -6 });
    expect(collection.pluck('id').join(',')).to.equal('0.5,1,2,2.5,3');
  });

  it('#set accepts options.at as a string', function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }]);
    collection.add([{ id: 3 }], { at: '1' });
    expect(collection.pluck('id')).to.deep.equal([1, 3, 2]);
  });

  it('adding multiple models triggers `update` event once', function () {
    var collection = new Backbone.Collection();
    collection.on('update', function () {
      expect(true).to.be.true;
    });
    collection.add([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it('removing models triggers `update` event once', function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }, { id: 3 }]);
    collection.on('update', function () {
      expect(true).to.be.true;
    });
    collection.remove([{ id: 1 }, { id: 2 }]);
  });

  it('remove does not trigger `update` when nothing removed', function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }]);
    collection.on('update', function () {
      expect(false).to.be.true;
    });
    collection.remove([{ id: 3 }]);
  });

  it('set triggers `set` event once', function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }]);
    collection.on('update', function () {
      expect(true).to.be.true;
    });
    collection.set([{ id: 1 }, { id: 3 }]);
  });

  it('set does not trigger `update` event when nothing added nor removed', function () {
    var collection = new Backbone.Collection([{ id: 1 }, { id: 2 }]);
    collection.on('update', function (coll, options) {
      expect(options.changes.added.length).to.equal(0);
      expect(options.changes.removed.length).to.equal(0);
      expect(options.changes.merged.length).to.equal(2);
    });
    collection.set([{ id: 1 }, { id: 2 }]);
  });

  it('#3662 - triggering change without model will not error', function () {
    var collection = new Backbone.Collection([{ id: 1 }]);
    var model = collection.first();
    collection.on('change', function (m) {
      expect(m).to.equal(undefined);
    });
    model.trigger('change');
  });

  it('#3871 - falsy parse result creates empty collection', function () {
    var collection = new class extends Backbone.Collection {
      parse(data, options) { }
    }();
    collection.set('', { parse: true });
    expect(collection.length).to.equal(0);
  });

  it("#3711 - remove's `update` event returns one removed model", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var collection = new Backbone.Collection([model]);
    collection.on('update', function (context, options) {
      var changed = options.changes;
      expect(changed.added).to.deep.equal([]);
      expect(changed.merged).to.deep.equal([]);
      expect(changed.removed[0]).to.equal(model);
    });
    collection.remove(model);
  });

  it("#3711 - remove's `update` event returns multiple removed models", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var collection = new Backbone.Collection([model, model2]);
    collection.on('update', function (context, options) {
      var changed = options.changes;
      expect(changed.added).to.deep.equal([]);
      expect(changed.merged).to.deep.equal([]);
      expect(changed.removed.length === 2).to.be.true;

      expect(
        _.indexOf(changed.removed, model) > -1 && _.indexOf(changed.removed, model2) > -1
      ).to.be.true;
    });
    collection.remove([model, model2]);
  });

  it("#3711 - set's `update` event returns one added model", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var collection = new Backbone.Collection();
    collection.on('update', function (context, options) {
      var addedModels = options.changes.added;
      expect(addedModels.length === 1).to.be.true;
      expect(addedModels[0]).to.equal(model);
    });
    collection.set(model);
  });

  it("#3711 - set's `update` event returns multiple added models", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var collection = new Backbone.Collection();
    collection.on('update', function (context, options) {
      var addedModels = options.changes.added;
      expect(addedModels.length === 2).to.be.true;
      expect(addedModels[0]).to.equal(model);
      expect(addedModels[1]).to.equal(model2);
    });
    collection.set([model, model2]);
  });

  it("#3711 - set's `update` event returns one removed model", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var model3 = new Backbone.Model({ id: 3, title: 'My Last Post' });
    var collection = new Backbone.Collection([model]);
    collection.on('update', function (context, options) {
      var changed = options.changes;
      expect(changed.added.length).to.equal(2);
      expect(changed.merged.length).to.equal(0);
      expect(changed.removed.length === 1).to.be.true;
      expect(changed.removed[0]).to.equal(model);
    });
    collection.set([model2, model3]);
  });

  it("#3711 - set's `update` event returns multiple removed models", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var model3 = new Backbone.Model({ id: 3, title: 'My Last Post' });
    var collection = new Backbone.Collection([model, model2]);
    collection.on('update', function (context, options) {
      var removedModels = options.changes.removed;
      expect(removedModels.length === 2).to.be.true;
      expect(removedModels[0]).to.equal(model);
      expect(removedModels[1]).to.equal(model2);
    });
    collection.set([model3]);
  });

  it("#3711 - set's `update` event returns one merged model", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var model2Update = new Backbone.Model({ id: 2, title: 'Second Post V2' });
    var collection = new Backbone.Collection([model, model2]);
    collection.on('update', function (context, options) {
      var mergedModels = options.changes.merged;
      expect(mergedModels.length === 1).to.be.true;
      expect(mergedModels[0].get('title')).to.equal(model2Update.get('title'));
    });
    collection.set([model2Update]);
  });

  it("#3711 - set's `update` event returns multiple merged models", function () {
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var modelUpdate = new Backbone.Model({ id: 1, title: 'First Post V2' });
    var model2 = new Backbone.Model({ id: 2, title: 'Second Post' });
    var model2Update = new Backbone.Model({ id: 2, title: 'Second Post V2' });
    var collection = new Backbone.Collection([model, model2]);
    collection.on('update', function (context, options) {
      var mergedModels = options.changes.merged;
      expect(mergedModels.length === 2).to.be.true;
      expect(mergedModels[0].get('title')).to.equal(model2Update.get('title'));
      expect(mergedModels[1].get('title')).to.equal(modelUpdate.get('title'));
    });
    collection.set([model2Update, modelUpdate]);
  });

  it("#3711 - set's `update` event should not be triggered adding a model which already exists exactly alike", function () {
    var fired = false;
    var model = new Backbone.Model({ id: 1, title: 'First Post' });
    var collection = new Backbone.Collection([model]);
    collection.on('update', function (context, options) {
      fired = true;
    });
    collection.set([model]);
    expect(fired).to.equal(false);
  });

  it('get models with `attributes` key', function () {
    var model = { id: 1, attributes: {} };
    var collection = new Backbone.Collection([model]);
    expect(collection.get(model)).to.be.ok;
  });
});

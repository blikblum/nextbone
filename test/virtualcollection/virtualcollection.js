import 'chai/chai.js';
import sinon from 'sinon';
import * as _ from 'lodash-es';
import * as Backbone from '../../nextbone';
import { VirtualCollection, buildFilter } from '../../virtualcollection';

const assert = window.chai.assert;

describe('VirtualCollection', function() {
  describe('#constructor', function() {
    it('should bind 10 listeners to its collection', function() {
      var collection = new Backbone.Collection([{ foo: 'bar' }, { foo: 'baz' }]);
      var vc = new VirtualCollection(collection);
      assert.deepEqual(_.keys(collection._events), [
        'add',
        'remove',
        'change',
        'reset',
        'filter',
        'sort',
        'update',
        'sync',
        'request',
        'load',
        'error'
      ]);
    });

    it('should build an index on instantiation', function() {
      var collection = new Backbone.Collection([
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
        { id: 3, foo: 'bar' }
      ]);
      var vc = new VirtualCollection(collection, {
        filter: { foo: 'bar' }
      });
      assert.equal(vc.models.length, 2);
    });

    it('should accept a destroyWith option and bind destroy event (Marionette)', function() {
      var vc, collection, eventEmitter;
      collection = new Backbone.Collection([{ id: 1, foo: 'bar' }]);
      eventEmitter = new Backbone.Events();
      sinon.spy(VirtualCollection.prototype, 'stopListening');
      vc = new VirtualCollection(collection, { destroyWith: eventEmitter });

      eventEmitter.trigger('destroy');
      assert.equal(vc.stopListening.callCount, 1);
      VirtualCollection.prototype.stopListening.restore();
    });
    it('should set the model from the collection', function() {
      var vc, MyModel, MyCollection, myModel, myCollection;
      MyModel = class extends Backbone.Model {
        foo() {
          return 'foo';
        }
      };
      MyCollection = class extends Backbone.Collection {
        static model = MyModel;
      };
      myCollection = new MyCollection([{ id: 1, foo: 'bar' }]);
      vc = new VirtualCollection(myCollection);
      myModel = new vc.model();
      assert.equal(myModel.foo(), 'foo');
    });
  });

  describe('#parent', function() {
    it('should allow to define the parent collection after instatiation', function() {
      var collection = new Backbone.Collection([
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
        { id: 3, foo: 'bar' }
      ]);
      var vc = new VirtualCollection(null, {
        filter: { foo: 'bar' }
      });

      assert.equal(vc.models.length, 0);

      vc.parent = collection;

      assert.equal(vc.models.length, 2);
    });

    it('should allow to swap the parent collection', function() {
      var collection = new Backbone.Collection([
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
        { id: 3, foo: 'bar' }
      ]);

      var otherCollection = new Backbone.Collection([
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
        { id: 3, foo: 'baz' }
      ]);

      var vc = new VirtualCollection(collection, {
        filter: { foo: 'bar' }
      });

      vc.parent = otherCollection;

      assert.equal(vc.models.length, 1);

      collection.add({ id: 4, foo: 'bar' });

      assert.equal(vc.models.length, 1);

      otherCollection.add({ id: 4, foo: 'bar' });

      assert.equal(vc.models.length, 2);
    });
  });

  describe('#acceptModel', function() {
    it('should be used as filter when filter option is not defined', function() {
      class CustomVirtualCollection extends VirtualCollection {
        acceptModel(model, index) {
          return model.get('foo') === 'bar';
        }
      }
      var collection = new Backbone.Collection([
        { id: 1, foo: 'bar' },
        { id: 2, foo: 'baz' },
        { id: 3, foo: 'bar' }
      ]);
      var vc = new CustomVirtualCollection(collection);
      assert.equal(vc.accepts, vc.acceptModel);
      assert.equal(vc.models.length, 2);
    });
  });

  describe('#model', function() {
    it('should inherit the model type of the parent collection', function() {
      var vc, collection, Library;

      class TestModel extends Backbone.Model {}

      Library = class extends Backbone.Collection {
        static model = TestModel;
      };

      collection = new Library([{ foo: 'bar' }, { foo: 'baz' }]);
      vc = new VirtualCollection(collection);
      assert.equal(vc.model, collection.constructor.model);
    });
  });

  describe('#each', function() {
    it('should iterate over the virtual collection in order', function() {
      var vc,
        result = [],
        collection = new Backbone.Collection([
          { id: 1, foo: 'bar' },
          { id: 2, foo: 'baz' },
          { id: 3, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, {
        filter: { foo: 'bar' }
      });
      vc.each(function(model) {
        result.push(model);
      });
      assert.deepEqual(result, vc.models);
    });
  });

  describe('#indexOf', function() {
    it('should return the index of a model as ordered in the virtual collection', function() {
      var vc,
        collection = new Backbone.Collection([
          { id: 1, foo: 'bar' },
          { id: 2, foo: 'baz' },
          { id: 3, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, {
        filter: { foo: 'bar' }
      });
      assert.equal(vc.indexOf(collection.at(2)), 1);
    });
  });

  describe('#where', function() {
    it('finds all the models matching the given attributes', function() {
      var vc,
        collection = new Backbone.Collection([
          { id: 1, foo: 'bar' },
          { id: 2, foo: 'baz' },
          { id: 3, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, { filter: { foo: 'bar' } });
      assert.equal(vc.where({ foo: 'bar' }).length, 2);
    });
  });

  describe('#findWhere', function() {
    it('finds the first model matching the given attributes', function() {
      var vc,
        collection = new Backbone.Collection([
          { id: 10, foo: 'bar' },
          { id: 20, foo: 'baz' },
          { id: 30, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, { filter: { foo: 'bar' } });
      assert.equal(vc.findWhere({ foo: 'bar' }).id, 10);
    });
  });

  describe('#pluck', function() {
    it('returns an array of ids', function() {
      var vc,
        collection = new Backbone.Collection([
          { id: 10, foo: 'bar' },
          { id: 20, foo: 'baz' },
          { id: 30, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, { filter: { foo: 'bar' } });
      assert.deepEqual(vc.pluck('id'), [10, 30]);
    });

    it('returns an array of attribute values', function() {
      var vc,
        collection = new Backbone.Collection([
          { id: 10, foo: 'bar' },
          { id: 20, foo: 'baz' },
          { id: 30, foo: 'bar' }
        ]);
      vc = new VirtualCollection(collection, { filter: { foo: 'bar' } });
      assert.deepEqual(vc.pluck('foo'), ['bar', 'bar']);
    });
  });

  describe('#_addIndex', function() {
    it('should use comparators to correctly order the model in the virtual collection', function() {
      var vc,
        collection = new Backbone.Collection(
          [
            { id: 1, ok: true, foo: 'ccc' },
            { id: 2, ok: false, foo: 'bbb' },
            { id: 3, ok: true, foo: 'aaa' }
          ],
          {
            comparator: 'foo' // sortBy foo attribute
          }
        );
      vc = new VirtualCollection(collection, {
        filter: { ok: true }
      });
      collection.add({ id: 4, ok: true, foo: 'abc' });
      assert.deepEqual(collection.pluck('id'), [3, 4, 2, 1]);
      assert.deepEqual(vc.pluck('id'), [3, 4, 1]);
    });
  });

  describe('#comparator', function() {
    it('should sort the virtual collection upon instantiation', function() {
      var collection = new Backbone.Collection(
          [{ id: 1, name: 'ccc' }, { id: 2, name: 'aaa' }, { id: 3, name: 'bbb' }],
          {
            comparator: 'id'
          }
        ),
        vc = new VirtualCollection(collection, {
          comparator: 'name'
        });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });
    it('should not order the virtual collection when the comparator is falsey', function() {
      var collection = new Backbone.Collection(
          [{ id: 1, name: 'ccc' }, { id: 2, name: 'aaa' }, { id: 3, name: 'bbb' }],
          {
            comparator: 'name'
          }
        ),
        vc = new VirtualCollection(collection, {
          comparator: false
        });
      collection.add({ id: 4, name: 'abc' });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1, 4]);
    });
    it('should accept a comparator()', function() {
      var collection = new Backbone.Collection(
          [{ id: 1, name: 'ccc' }, { id: 2, name: 'aaa' }, { id: 3, name: 'bbb' }],
          {
            comparator: 'id'
          }
        ),
        vc = new VirtualCollection(collection, {
          comparator: function(item) {
            return item.get('name');
          }
        });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });
    it('should accept a comparator() that compares two models', function() {
      var collection = new Backbone.Collection(
          [{ id: 1, name: 'ccc' }, { id: 2, name: 'aaa' }, { id: 3, name: 'bbb' }],
          {
            comparator: 'id'
          }
        ),
        vc = new VirtualCollection(collection, {
          // sort by string DESC
          comparator: function(a, b) {
            return a.get('name') < b.get('name') ? 1 : -1;
          }
        });
      assert.deepEqual(vc.pluck('id'), [1, 3, 2]);
    });
    it('should keep the virtual collection sorted when adding items', function() {
      var collection = new Backbone.Collection([{ id: 1, name: 'ccc' }, { id: 3, name: 'bbb' }], {
          comparator: 'id'
        }),
        vc = new VirtualCollection(collection, { comparator: 'name' });
      assert.deepEqual(vc.pluck('id'), [3, 1]);

      collection.add({ id: 2, name: 'aaa' });
      assert.deepEqual(vc.pluck('id'), [2, 3, 1]);
    });

    it('should update the virtual collection when a `reset` event is triggered by the parent collection', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'b' }
        });
      collection.reset([
        new Backbone.Model({ type: 'b' }),
        new Backbone.Model({ type: 'b' }),
        new Backbone.Model({ type: 'b' })
      ]);

      assert.equal(vc.length, collection.length);
    });
    it('should respect the order of the parent collection if no comparator is specified', function() {
      var collection = new class extends Backbone.Collection {
        comparator = 'name';
      }();
      collection.reset([{ name: 'b' }, { name: 'z' }, { name: 'a' }]);

      assert.deepEqual(
        collection.map(function(i) {
          return i.get('name');
        }),
        ['a', 'b', 'z']
      );
      var vc = new VirtualCollection(collection, {
        filter: function(model) {
          return model.get('name') === 'a' || model.get('name') === 'b';
        }
      });
      assert.deepEqual(
        vc.map(function(i) {
          return i.get('name');
        }),
        ['a', 'b']
      );
    });
  });
  describe('#clone', function() {
    it('should return an instance of the parent collection with the filtered models', function() {
      var ACollection = class extends Backbone.Collection {
        foo = 'bar';
      };
      var ac = new ACollection([{ type: 1 }, { type: 2 }, { type: 1 }, { type: 2 }]);
      assert.equal(ac.length, 4);
      var vc = new VirtualCollection(ac, { filter: { type: 2 } });
      var vcClone = vc.clone();
      assert.equal(vcClone.length, 2);
      assert(vcClone instanceof ACollection, 'clone instanciates the parent collection class');
    });
  });
  describe('#map', function() {
    it('should map the models in the virtual collection', function() {
      var collection = new Backbone.Collection([
          { type: 'a', name: 'hodor' },
          { type: 'a', name: 'khalesi' },
          { type: 'b' }
        ]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        context = { foo: ' bar' };
      assert.deepEqual(
        vc.map(function(m) {
          return m.get('name') + this.foo;
        }, context),
        ['hodor bar', 'khalesi bar']
      );
    });
  });

  describe('#each', function() {
    it('should iterate over the models in the virtual collection', function() {
      var collection = new Backbone.Collection([
          { type: 'a', name: 'hodor' },
          { type: 'a', name: 'khalesi' },
          { type: 'b' }
        ]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        context = { foo: ' bar' },
        collect = [];

      vc.each(function(m) {
        collect.push(m.get('name') + this.foo);
      }, context);
      assert.deepEqual(collect, ['hodor bar', 'khalesi bar']);
    });
  });

  describe('#get', function() {
    it('should return the model if it belongs in the virtual collection', function() {
      var collection = new Backbone.Collection([{ type: 'a', id: 1 }, { type: 'b', id: 2 }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        });

      assert.equal(vc.get(1), collection.get(1));
      assert.equal(vc.get(2), undefined);
    });
  });

  describe('#at', function() {
    it('should return the model at the specified index of the virtual collection', function() {
      var collection = new Backbone.Collection([{ type: 'a', id: 1 }, { type: 'b', id: 2 }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'b' }
        });

      assert.equal(vc.at(0), collection.get(2));
    });
  });

  describe('#toJSON', function() {
    it('should return a JSON representation of the models in the virtual collection', function() {
      var collection = new Backbone.Collection([
          { age: 23, name: 'John' },
          { age: 44, name: 'Papa' },
          { age: 44, name: 'Terry' }
        ]),
        vc = new VirtualCollection(collection, {
          filter: { age: 44 }
        });

      assert.deepEqual(vc.toJSON(), [{ age: 44, name: 'Papa' }, { age: 44, name: 'Terry' }]);
    });
  });

  describe('add & remove', function() {
    it('should proxy up to the parent', function() {
      var collection = new Backbone.Collection([]);
      var vc = new VirtualCollection(collection, {});
      vc.add({ id: 2 });
      assert.equal(collection.length, 1);
      var model = vc.remove(collection.at(0));
      assert(model.id === 2);
      assert.equal(collection.length, 0);
    });
  });

  describe('proxy parent events', function() {
    it('should proxy the sync event', function() {
      var collection = new Backbone.Collection([]),
        eventSpy = sinon.spy();

      var vc = new VirtualCollection(collection, {});
      vc.on('sync', eventSpy);

      collection.trigger('sync');

      assert(eventSpy.called);
    });

    it('should proxy the request event', function() {
      var collection = new Backbone.Collection([]),
        eventSpy = sinon.spy(),
        vc = new VirtualCollection(collection, {});
      vc.on('request', eventSpy);

      collection.trigger('request');

      assert(eventSpy.called);
    });

    it('should proxy the error event', function() {
      var collection = new Backbone.Collection([]),
        eventSpy = sinon.spy();

      var vc = new VirtualCollection(collection, {});
      vc.on('error', eventSpy);

      collection.trigger('error');

      assert(eventSpy.called);
    });

    it('should proxy the load event', function() {
      var collection = new Backbone.Collection([]),
        eventSpy = sinon.spy();

      var vc = new VirtualCollection(collection, {});
      vc.on('load', eventSpy);

      collection.trigger('load');

      assert(eventSpy.called);
    });

    it('should proxy event arguments', function() {
      var collection = new Backbone.Collection([]),
        eventSpy = sinon.spy();

      var vc = new VirtualCollection(collection, {});
      vc.on('error', eventSpy);

      collection.trigger('error', 'foo', 'bar');

      assert(eventSpy.calledWith('foo', 'bar'));
    });
  });

  describe('#filter', function() {
    it('should receive the model and index as arguments', function() {
      var i = 0,
        collection = new Backbone.Collection([{ id: 1 }, { id: 2 }]);

      var vc = new VirtualCollection(collection, {
        filter: function(model, index) {
          assert.equal(model.id, i + 1);
          assert.equal(index, i);
          i++;
        }
      });
    });
  });

  describe('url', function() {
    it('should _.result to a string when parent collection url property is a string', function() {
      var collection = new Backbone.Collection([]);
      collection.url = '/fake-endpoint';

      var vc = new VirtualCollection(collection, {});
      assert.equal(true, _.isString(_.result(vc, 'url')));
    });
    it('should _.result to a string when parent collection url property is a function', function() {
      var collection = new Backbone.Collection([]);
      collection.url = function() {
        return '/fake-endpoint';
      };

      var vc = new VirtualCollection(collection, {});
      assert.equal(true, _.isString(_.result(vc, 'url')));
    });
  });

  describe('buildFilter', function() {
    it('should build a single-attribute filter that matches a model', function() {
      var filter = buildFilter({ foo: 'bar' });
      assert.equal(true, filter(new Backbone.Model({ foo: 'bar' })));
    });
    it('should build a single-attribute filter that rejects a model', function() {
      var filter = buildFilter({ foo: 'bar' });
      assert.equal(false, filter(new Backbone.Model({ foo: 'car' })));
    });
    it('should build a multiple-attribute filter that matches a model', function() {
      var filter = buildFilter({ foo: 'bar', ginger: 'ale' });
      assert.equal(true, filter(new Backbone.Model({ foo: 'bar', ginger: 'ale' })));
    });
    it('should build a multiple-attribute filter that rejects a model', function() {
      var filter = buildFilter({ foo: 'bar', ginger: 'ale' });
      assert.equal(false, filter(new Backbone.Model({ foo: 'bar' })));
    });
    it('should build a filter that matches model attributes with null values', function() {
      var filter = buildFilter({ foo: 'bar', ginger: null });
      assert.equal(false, filter(new Backbone.Model({ foo: 'bar', ginger: 'not null' })));
      assert.equal(true, filter(new Backbone.Model({ foo: 'bar', ginger: null })));
    });
    it('should build a filter that matches model attributes with undefined values', function() {
      var filter = buildFilter({
        foo: 'bar',
        ginger: undefined
      });
      assert.equal(false, filter(new Backbone.Model({ foo: 'bar', ginger: 'not null' })));
      assert.equal(true, filter(new Backbone.Model({ foo: 'bar', ginger: undefined })));
    });
  });
  describe('events', function() {
    it('should trigger a `reset` event when the parent collection is reset', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('reset', function() {
        called = true;
      });
      collection.reset([{ type: 'a' }, { type: 'a' }]);

      assert(called);
      assert.equal(vc.length, 2);
    });
    it('should trigger an `add` event when a matching model is added to the parent', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('add', function() {
        called = true;
      });
      collection.add({ type: 'a' });

      assert(called);
      assert.equal(vc.length, 2);
    });
    it('should not trigger an `add` event when an unmatching model is added to the parent', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('add', function() {
        called = true;
      });
      collection.add({ type: 'b' });

      assert(!called);
      assert.equal(vc.length, 1);
    });
    it('should not trigger an `add` event twice when two virtual collections share a parent and modify its models', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc1 = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        vc2 = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = 0;

      vc1.on('add', function(model) {
        model.set('foo', 'bar');
      });
      vc2.on('add', function(model) {
        called++;
      });
      collection.add({ type: 'a' });
      assert(called === 1);
    });
    it('should trigger a `remove` event when a matching model is removed from the parent', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('remove', function() {
        called = true;
      });
      collection.remove(collection.at(0));

      assert(called);
      assert.equal(vc.length, 0);
    });
    it('should not trigger a `remove` event when an unmatching model is removed from the parent', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('remove', function() {
        called = true;
      });
      collection.remove(collection.at(1));

      assert(!called);
      assert.equal(vc.length, 1);
    });

    it('should trigger a `remove` event when a model no longer passes the filter', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('remove', function() {
        called = true;
      });
      collection.at(0).set({ type: 'b' });

      assert(called);
      assert(vc.length === 0);
    });
    it('should trigger an `add` event when a modified model now passes the filter', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('add', function() {
        called = true;
      });
      collection.at(1).set({ type: 'a' });

      assert(called);
      assert(vc.length === 2);
    });
    it('should trigger an `update` event when parent collection is updated passing its own changes object', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;

      vc.on('update', function(coll, options) {
        called = options.changes.removed.length === 1 && options.changes.added.length === 2;
      });
      collection.set([{ type: 'a' }, { type: 'a' }, { type: 'b' }, { type: 'c' }]);

      assert(called);
    });

    it('should not trigger an `update` event when parent collection is updated and change is not accepted', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        });
      var updateSpy = sinon.spy();

      vc.on('update', updateSpy);
      collection.add([{ type: 'b' }, { type: 'c' }]);

      sinon.assert.notCalled(updateSpy);
    });

    it('should trigger a `change` event when a model in the virtual collection is changed', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        changeSpy = sinon.spy();

      vc.on('change', changeSpy);
      collection.at(0).set({ foo: 'bar' });

      assert(changeSpy.called);
      assert(changeSpy.calledOnce);
      assert(vc.length === 1);
    });
    it('should trigger a `change:[attributeName]` event when a models attribute in the original collection is changed', function() {
      var collection = new Backbone.Collection([{ type: 'a', testProperty: false }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = false;
      vc.on('change:testProperty', function() {
        called = true;
      });
      collection.at(0).set({ testProperty: true });
      assert(called);
      assert(vc.length === 1);
    });
    it('should trigger a `change:[attributeName]` event when a models attribute, in the original collection but added to the virtual one after, is changed', function() {
      var collection = new Backbone.Collection([{ type: 'a', testProperty: false }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'c' }
        }),
        called = false;
      vc.on('change:testProperty', function() {
        called = true;
      });
      assert(vc.length === 0);
      collection.at(0).set({ type: 'c' });
      assert(vc.length === 1);
      collection.at(0).set({ testProperty: true });
      assert(called);
    });
    it('should trigger a `filter` event when updateFilter() is called', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        filter = sinon.stub(),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        });

      vc.on('filter', filter);
      vc.updateFilter({ type: 'b' });

      assert(filter.called);
      assert(vc.length === 1);
    });
    it('should trigger a `reset` event when updateFilter() is called', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        reset = sinon.stub(),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        });

      vc.on('reset', reset);
      vc.updateFilter({ type: 'b' });

      assert(reset.called);
      assert(vc.length === 1);
    });
    it('should allow to call updateFilter() without a filter', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: function(m, i) {
            return i === 0;
          }
        });

      var oldAccepts = vc.accepts;
      vc.updateFilter();
      assert.equal(oldAccepts, vc.accepts);
    });
    it('should ignore malformed change event arguments', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]);

      var vc = new VirtualCollection(collection, {
        filter: { type: 'a' }
      });
      assert.doesNotThrow(function() {
        collection.first().trigger('foo');
      });
    });
    it('should trigger a `sort` event when a comparator is set on the virtual collection and a model matching the filter is added to the base collection', function() {
      var collection = new Backbone.Collection([
        { type: 'a', sort: 'a' },
        { type: 'b', sort: 'b' }
      ]);
      var sort = sinon.stub();
      var vc = new VirtualCollection(collection, {
        filter: { type: 'a' },
        comparator: 'sort'
      });

      vc.on('sort', sort);
      collection.add({ type: 'a', sort: 'c' });

      assert(sort.called);
    });
    it('should trigger a `sort` event when a comparator is set on the virtual collection and a model in the base collection is updated to match the filter', function() {
      var modelToUpdate = new Backbone.Model({ type: 'b', sort: 'b' });
      var collection = new Backbone.Collection([{ type: 'a', sort: 'a' }, modelToUpdate]);
      var sort = sinon.stub();
      var vc = new VirtualCollection(collection, {
        filter: { type: 'a' },
        comparator: 'sort'
      });

      vc.on('sort', sort);
      modelToUpdate.set('type', 'a');

      assert(sort.called);
    });
    it('should not trigger a `sort` event when a comparator is set on the virtual collection and a model not matching the filter is added to the base collection', function() {
      var collection = new Backbone.Collection([
        { type: 'a', sort: 'a' },
        { type: 'b', sort: 'b' }
      ]);
      var sort = sinon.stub();
      var vc = new VirtualCollection(collection, {
        filter: { type: 'a' },
        comparator: 'sort'
      });

      vc.on('sort', sort);
      collection.add({ type: 'b', sort: 'c' });

      assert(!sort.called);
    });
  });
  describe('accepts & get', function() {
    it('should not call accepts() when iterating over the virtual collection', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        filterFn = function(model) {
          return model.get('type') === 'a';
        };

      var vc = new VirtualCollection(collection, {
        filter: filterFn
      });

      sinon.spy(vc, 'accepts');

      vc.each(function(model) {
        //looping collection
      });

      assert(!vc.accepts.called);
    });
    it('should not call get() when iterating over nested virtual collections', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]),
        filterFunction;

      var grandpaVc = new VirtualCollection(collection, {
        filter: { type: 'a' }
      });

      var daddyVc = new VirtualCollection(grandpaVc, {
        filter: { type: 'a' }
      });

      var vc = new VirtualCollection(daddyVc, {
        filter: { type: 'a' }
      });

      sinon.spy(collection, 'get');
      sinon.spy(vc, 'get');
      sinon.spy(daddyVc, 'get');
      sinon.spy(grandpaVc, 'get');

      vc.each(function(model) {
        //looping collection
      });

      assert(!vc.get.called);
      assert(!daddyVc.get.called);
      assert(!grandpaVc.get.called);
      assert(!collection.get.called);
    });
  });
  describe('sorting', function() {
    it('should ignore parent collection sort event if it has a comparator', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'b' }]);

      var vc = new VirtualCollection(collection, {
        comparator: function(m) {
          return m.get('type');
        }
      });

      sinon.spy(vc, 'orderViaParent');
      collection.trigger('sort');

      assert(!vc.orderViaParent.called);
    });

    it('should should inherit new model order if it does not have a comparator', function() {
      var collection = new class extends Backbone.Collection {
        comparator = 'type';
      }([{ type: 'a' }, { type: 'c' }, { type: 'b' }]);

      var vc = new VirtualCollection(collection);

      sinon.spy(vc, 'orderViaParent');
      collection.sort();

      assert(vc.orderViaParent.called);
      assert.equal(vc.at(2).get('type'), 'c');
    });
    it('should add new models at the correct position if it has a comparator that accepts one model', function() {
      var collection = new Backbone.Collection([{ type: 'a' }, { type: 'c' }]);

      var vc = new VirtualCollection(collection, {
        comparator: function(m) {
          return m.get('type');
        }
      });

      collection.add({ type: 'b' });

      assert.equal(vc.at(1).get('type'), 'b');
    });

    it('should add new models at the correct position if it has a comparator that accepts two models', function() {
      var collection = new Backbone.Collection([
        { type: 'a' },
        { type: 'c' },
        { type: 'd' },
        { type: 'z' }
      ]);

      var vc = new VirtualCollection(collection, {
        comparator: function(a, b) {
          return a.get('type').charCodeAt(0) - b.get('type').charCodeAt(0);
        }
      });

      collection.add({ type: 'b' });
      assert.equal(vc.at(1).get('type'), 'b');
    });

    it('should not have duplicate model event handlers after rebuilding the index', function() {
      var collection = new Backbone.Collection([{ type: 'a', testProperty: false }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'a' }
        }),
        called = 0;
      vc.on('change:testProperty', function() {
        called++;
      });
      vc._rebuildIndex();
      collection.at(0).set({ testProperty: true });
      assert(called === 1);
      assert(vc.length === 1);
    });
    it('should be able to get model by ID if id present', function(done) {
      var collection = new Backbone.Collection([{ type: 'b' }]),
        model,
        stub,
        vc = new VirtualCollection(collection);

      stub = sinon.stub(Backbone.ajax, 'handler').yieldsTo('success', { id: 1 });

      function onSuccess() {
        assert(vc.get(1).id === 1);
        stub.restore();
        done();
      }

      model = new Backbone.Model({ type: 'a' });
      vc.add(model);
      model.url = '/fake-endpoint';
      model.save({ type: 'c' }, { success: onSuccess });
    });

    it('should not trigger change events on models that are no longer in the virtual collection', function() {
      var collection = new Backbone.Collection([{ type: 'z', testProperty: false }, { type: 'b' }]),
        vc = new VirtualCollection(collection, {
          filter: { type: 'z' }
        }),
        called = 0;

      assert(vc.length === 1);

      var model = collection.at(0);
      // remove the one model from the vc by changing the filtered property
      model.set({ type: 'b' });
      // assert vc is empty
      assert(vc.length === 0);

      // change property on model that was previously in vc
      vc.on('change', function() {
        called++;
      });
      model.set({ testProperty: true });

      // assert the changed evenet on vc isnt triggered
      assert(called === 0);
    });
  });

  describe('isLoading', function() {
    it('should be reflected with successful fetch', function(done) {
      var resolve;
      var ajaxResponse = new Promise(function(res) {
        resolve = res;
      });
      var collection = new Backbone.Collection();
      collection.url = '/test';
      collection.sync = function() {
        return ajaxResponse;
      };
      var vc = new VirtualCollection(collection);
      assert.equal(collection.isLoading, false);
      assert.equal(vc.isLoading, false);
      vc.on('sync', function() {
        assert.equal(collection.isLoading, false);
        assert.equal(vc.isLoading, false);
      });
      collection.fetch().then(function() {
        assert.equal(collection.isLoading, false);
        assert.equal(vc.isLoading, false);
        done();
      });
      assert.equal(collection.isLoading, true);
      assert.equal(vc.isLoading, true);
      resolve({ a: 1 });
    });

    it('should be reflected with failed fetch', function(done) {
      var reject;
      var ajaxResponse = new Promise(function(res, rej) {
        reject = rej;
      });
      var collection = new Backbone.Collection();
      collection.url = '/test';
      collection.sync = function() {
        return ajaxResponse;
      };
      var vc = new VirtualCollection(collection);
      assert.equal(collection.isLoading, false);
      assert.equal(vc.isLoading, false);
      vc.on('error', function() {
        assert.equal(collection.isLoading, false);
        assert.equal(vc.isLoading, false);
      });
      collection.fetch()['catch'](function() {
        assert.equal(collection.isLoading, false);
        assert.equal(vc.isLoading, false);
        done();
      });
      assert.equal(collection.isLoading, true);
      assert.equal(vc.isLoading, true);
      reject({ fail: true });
    });

    it('should be reflected when created while parent is loading', function(done) {
      var resolve;
      var ajaxResponse = new Promise(function(res) {
        resolve = res;
      });
      var collection = new Backbone.Collection();
      collection.url = '/test';
      collection.sync = function() {
        return ajaxResponse;
      };
      var vc;
      collection.fetch().then(function() {
        assert.equal(collection.isLoading, false);
        assert.equal(vc.isLoading, false);
        done();
      });
      assert.equal(collection.isLoading, true);
      vc = new VirtualCollection(collection);
      assert.equal(vc.isLoading, true);
      resolve({ a: 1 });
    });
  });
});

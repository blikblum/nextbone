import { Collection } from './nextbone';
import { isFunction, sortedIndex, invoke, includes, partial, extend } from 'underscore';

var explicitlyHandledEvents = ['add', 'remove', 'change', 'reset', 'sort'];

var clone = function(obj) {
  return obj ? Object.assign({}, obj) : {};
};

class VirtualCollection extends Collection {
  static buildFilter(options) {
    if (!options) {
      return function() {
        return true;
      };
    } else if (isFunction(options)) {
      return options;
    } else if (options.constructor === Object) {
      return function(model) {
        return Object.keys(options).every(function(key) {
          return model.get(key) === options[key];
        });
      };
    }
  }

  constructor(collection, options = {}) {
    super(null, options);
    this.collection = collection;

    if (options.destroyWith) this.bindLifecycle(options.destroyWith, 'destroy');
    if (collection.constructor.model) this.model = collection.constructor.model;
    this._clearChangesCache();

    this.accepts = VirtualCollection.buildFilter(options.filter);
    this._rebuildIndex();
    this.listenTo(this.collection, 'add', this._onAdd);
    this.listenTo(this.collection, 'remove', this._onRemove);
    this.listenTo(this.collection, 'change', this._onChange);
    this.listenTo(this.collection, 'reset', this._onReset);
    this.listenTo(this.collection, 'filter', this._onFilter);
    this.listenTo(this.collection, 'sort', this._onSort);
    this.listenTo(this.collection, 'update', this._onUpdate);
    this._proxyParentEvents(['sync', 'request', 'error']);
  }

  bindLifecycle(view, methodName) {
    this.listenTo(view, methodName, this.stopListening);
  }

  updateFilter(filter) {
    this.accepts = VirtualCollection.buildFilter(filter);
    this._rebuildIndex();
    this.trigger('filter', this, filter);
    this.trigger('reset', this, filter);
    return this;
  }

  _rebuildIndex() {
    invoke(this.models, 'off', 'all', this._onAllEvent, this);
    this._reset();
    this.collection.each((model, i) => {
      if (this.accepts(model, i)) {
        this.listenTo(model, 'all', this._onAllEvent);
        this.models.push(model);
        this._byId[model.cid] = model;
        if (model.id) this._byId[model.id] = model;
      }
    });
    this.length = this.models.length;

    if (this.comparator) this.sort({ silent: true });
  }

  orderViaParent(options) {
    this.models = this.collection.filter(model => {
      return this._byId[model.cid] !== undefined;
    });
    if (!options.silent) this.trigger('sort', this, options);
  }

  _onSort(collection, options) {
    if (this.comparator !== undefined) return;
    this.orderViaParent(options);
  }

  _proxyParentEvents(events) {
    events.forEach(eventName => {
      this.listenTo(this.collection, eventName, partial(this.trigger, eventName));
    });
  }

  _clearChangesCache() {
    this._changeCache = {
      added: [],
      removed: [],
      merged: []
    };
  }

  _onUpdate(collection, options) {
    var newOptions = extend({}, options, { changes: this._changeCache });
    this.trigger('update', this, newOptions);
    this._clearChangesCache();
  }

  _onAdd(model, collection, options) {
    if (this.get(model) || !this.accepts(model, options.index)) return;
    this._changeCache.added.push(model);
    this._indexAdd(model);
    this.listenTo(model, 'all', this._onAllEvent);
    this.trigger('add', model, this, options);
    if (this.comparator !== undefined) {
      this.trigger('sort', this, options);
    }
  }

  _onRemove(model, collection, options) {
    if (!this.get(model)) return;
    this._changeCache.removed.push(model);
    var i = this._indexRemove(model),
      optionsClone = clone(options);
    optionsClone.index = i;
    model.off('all', this._onAllEvent, this);
    this.trigger('remove', model, this, optionsClone);
  }

  _onChange(model, options) {
    if (!model || !options) return; // ignore malformed arguments coming from custom events
    var alreadyHere = this.get(model);

    if (this.accepts(model, options.index)) {
      if (alreadyHere) {
        if (!this._byId[model.id] && model.id) {
          this._byId[model.id] = model;
        }
        this.trigger('change', model, this, options);
      } else {
        this._onAdd(model, this.collection, options);
      }
    } else if (alreadyHere) {
      var i = this._indexRemove(model),
        optionsClone = clone(options);
      optionsClone.index = i;
      this.trigger('remove', model, this, optionsClone);
    }
  }

  _onReset(collection, options) {
    this._rebuildIndex();
    this.trigger('reset', this, options);
  }

  _onFilter(collection, options) {
    this._rebuildIndex();
    this.trigger('filter', this, options);
  }

  sortedIndex(model, value, context) {
    var iterator = isFunction(value)
      ? value
      : function(target) {
          return target.get(value);
        };

    if (iterator.length === 1) {
      return sortedIndex(this.models, model, iterator.bind(context));
    }
    return sortedIndexTwo(this.models, model, iterator, context);
  }

  _indexAdd(model) {
    if (this.get(model)) return;
    var i;
    // uses a binsearch to find the right index
    if (this.comparator) {
      i = this.sortedIndex(model, this.comparator, this);
    } else if (this.comparator === undefined) {
      i = this.sortedIndex(
        model,
        function(target) {
          //TODO: indexOf traverses the array every time the iterator is called
          return this.collection.indexOf(target);
        },
        this
      );
    } else {
      i = this.length;
    }
    this.models.splice(i, 0, model);
    this._byId[model.cid] = model;
    if (model.id) this._byId[model.id] = model;
    this.length += 1;
  }

  _indexRemove(model) {
    model.off('all', this._onAllEvent, this);
    var i = this.indexOf(model);
    if (i === -1) return i;
    this.models.splice(i, 1);
    delete this._byId[model.cid];
    if (model.id) delete this._byId[model.id];
    this.length -= 1;
    return i;
  }

  _onAllEvent(eventName) {
    if (!includes(explicitlyHandledEvents, eventName)) {
      this.trigger.apply(this, arguments);
    }
  }

  clone() {
    return new this.collection.constructor(this.models);
  }
}

// methods that alter data should proxy to the parent collection

[
  'add',
  'remove',
  'set',
  'reset',
  'push',
  'pop',
  'unshift',
  'shift',
  'slice',
  'sync',
  'fetch',
  'url'
].forEach(function(methodName) {
  VirtualCollection.prototype[methodName] = function() {
    var method = this.collection[methodName];
    if (isFunction(method)) {
      return method.apply(this.collection, arguments);
    }
    return method;
  };
});

/**

Equivalent to sortedIndex, but for comparators with two arguments

**/
function sortedIndexTwo(array, obj, iterator, context) {
  var low = 0,
    high = array.length;
  while (low < high) {
    var mid = (low + high) >>> 1;
    iterator.call(context, obj, array[mid]) > 0 ? (low = mid + 1) : (high = mid);
  }
  return low;
}

export { VirtualCollection };

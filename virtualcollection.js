import { createMicrotaskBatcher, createWatchedProxy } from './dist/class-utils.js';
import { Collection } from './nextbone.js';
import { isFunction, sortedIndexBy, extend } from 'lodash-es';

/**
 * @import { Model, CollectionComparator } from './nextbone.js'
 *
 * @template {Record<string, any>} [Params=Record<string, any>]
 * @typedef VirtualCollectionOptions
 * @property {ModelFilter} [filter]
 * @property {Model | Collection} [destroyWith]
 * @property {CollectionComparator<Model>} [comparator]
 * @property {new (...args: any[]) => Model | ((...args: any[]) => Model)} [model]
 * @property {Params} [params]
 *
 *
 * @callback ModelFilterFunction
 * @param {Model} model
 * @param {Params} params
 * @param {number} index
 * @return boolean
 *
 * @typedef {Record<string, any> | ModelFilterFunction<Params>} ModelFilter
 */

var explicitlyHandledEvents = ['add', 'remove', 'change', 'reset', 'sort'];

function onModelAllEvent(eventName) {
  if (explicitlyHandledEvents.indexOf(eventName) === -1) {
    this.trigger.apply(this, arguments);
  }
}

var buildFilter = function (options) {
  if (!options) {
    return function () {
      return true;
    };
  } else if (isFunction(options)) {
    return options;
  } else if (options.constructor === Object) {
    return function (model) {
      return Object.keys(options).every(function (key) {
        return model.get(key) === options[key];
      });
    };
  }
};

/**
 * @class VirtualCollection
 * @description A virtual collection is a collection that is a filtered view of another collection.
 * @template {Model} [TModel=Model]
 * @template {Record<string, any>} [Params=Record<string, any>]
 * @extends {Collection<TModel>}
 */
class VirtualCollection extends Collection {
  /** @type {Collection} */
  _parent;

  /**
   * @param {Collection | null} [parent]
   * @param {VirtualCollectionOptions<Params>} [options]
   */
  constructor(parent, options = {}) {
    super(null, options);
    const { destroyWith, filter, params = {} } = options;

    this._queueFilterUpdate = createMicrotaskBatcher(() => {
      this.updateFilter();
    });

    /** @type {Params} */
    this._params = createWatchedProxy({ ...params }, this._queueFilterUpdate);

    if (destroyWith) this.listenTo(destroyWith, 'destroy', this.stopListening);
    this._clearChangesCache();

    this.accepts = buildFilter(filter || this.acceptModel);
    this.parent = parent;
  }

  /**
   * @type {Collection}
   */
  get parent() {
    return this._parent;
  }

  set parent(value) {
    if (value == this._parent) return; // eslint-disable-line eqeqeq
    if (this._parent) this.stopListening();
    this._parent = value;
    if (value) {
      this.isLoading = value.isLoading;
      if (value.constructor.model) this.model = value.constructor.model;
      this._rebuildIndex();
      this.listenTo(value, 'add', this._onAdd);
      this.listenTo(value, 'remove', this._onRemove);
      this.listenTo(value, 'change', this._onChange);
      this.listenTo(value, 'reset', this._onReset);
      this.listenTo(value, 'filter', this._onFilter);
      this.listenTo(value, 'sort', this._onSort);
      this.listenTo(value, 'update', this._onUpdate);
      this._proxyParentEvents(value, ['sync', 'request', 'load', 'error']);
    }
  }

  /** @returns {Params} */
  get params() {
    return this._params;
  }

  /** @param {Params} value */
  set params(params) {
    if (!params || typeof params !== 'object') {
      throw new Error('VirtualCollection: params should be an object');
    }

    this._params = createWatchedProxy({ ...params }, this._queueFilterUpdate);
    this._queueFilterUpdate();
  }

  /**
   * @param {ModelFilter<Params>} [filter]
   * @returns {VirtualCollection}
   */
  updateFilter(filter) {
    if (filter) {
      this.accepts = buildFilter(filter);
    }
    this._rebuildIndex();
    this.trigger('filter', this, filter);
    this.trigger('reset', this, filter);
    return this;
  }

  _rebuildIndex() {
    var params = { ...this._params };
    this.models.forEach((model) => this.stopListening(model, 'all'));
    this._reset();
    this._parent?.each((model, i) => {
      if (this.accepts(model, params, i)) {
        this.listenTo(model, 'all', onModelAllEvent);
        this.models.push(model);
        this._byId[model.cid] = model;
        if (model.id) this._byId[model.id] = model;
      }
    });
    this.length = this.models.length;

    if (this.comparator) this.sort({ silent: true });
  }

  orderViaParent(options) {
    this.models = this._parent.filter((model) => {
      return this._byId[model.cid] !== undefined;
    });
    if (!options.silent) this.trigger('sort', this, options);
  }

  _onSort(collection, options) {
    if (this.comparator !== undefined) return;
    this.orderViaParent(options);
  }

  _proxyParentEvents(collection, events) {
    events.forEach((eventName) => {
      this.listenTo(collection, eventName, (...args) => {
        this.isLoading = collection.isLoading;
        this.trigger(eventName, ...args);
      });
    });
  }

  _clearChangesCache() {
    this._changeCache = {
      added: [],
      removed: [],
      merged: [],
    };
  }

  _onUpdate(collection, options) {
    var changes = this._changeCache;
    if (changes.added.length || changes.removed.length || changes.merged.length) {
      var newOptions = extend({}, options, { changes });
      this.trigger('update', this, newOptions);
      this._clearChangesCache();
    }
  }

  _onAdd(model, collection, options) {
    if (this.get(model) || !this.accepts(model, options.index)) return;
    this._changeCache.added.push(model);
    this._indexAdd(model);
    this.listenTo(model, 'all', onModelAllEvent);
    this.trigger('add', model, this, options);
    if (this.comparator !== undefined) {
      this.trigger('sort', this, options);
    }
  }

  _onRemove(model, collection, options) {
    if (!this.get(model)) return;
    this._changeCache.removed.push(model);
    var index = this._indexRemove(model);
    this.stopListening(model, 'all');
    this.trigger('remove', model, this, { ...options, index });
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
        this._onAdd(model, this._parent, options);
      }
    } else if (alreadyHere) {
      var index = this._indexRemove(model);
      this.trigger('remove', model, this, { ...options, index });
    }
  }

  _onReset(collection, options) {
    this._rebuildIndex();
    this.trigger('reset', this, options);
  }

  _onFilter(collection, options) {
    this.trigger('filter', this, options);
  }

  sortedIndex(model, value, context) {
    var iterator = isFunction(value)
      ? value
      : function (target) {
          return target.get(value);
        };

    if (iterator.length === 1) {
      return sortedIndexBy(this.models, model, iterator.bind(context));
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
        function (target) {
          //TODO: indexOf traverses the array every time the iterator is called
          return this._parent.indexOf(target);
        },
        this,
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
    this.stopListening(model, 'all');
    var i = this.indexOf(model);
    if (i === -1) return i;
    this.models.splice(i, 1);
    delete this._byId[model.cid];
    if (model.id) delete this._byId[model.id];
    this.length -= 1;
    return i;
  }

  clone() {
    return new this._parent.constructor(this.models);
  }
}

/**
 * Equivalent to sortedIndex, but for comparators with two arguments
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

export { VirtualCollection, buildFilter };

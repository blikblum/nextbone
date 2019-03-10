import { sync } from './nextbone.js';

/** Generates 4 random hex digits
 * @returns {string} 4 Random hex digits
 */
function s4() {
  const rand = (1 + Math.random()) * 0x10000;
  return (rand | 0).toString(16).substring(1);
}

/** Generate a pseudo-guid
 * @returns {string} A GUID-like string.
 */
export function guid() {
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
}

/** The default serializer for transforming your saved data to localStorage */
const defaultSerializer = {
  /** Return a JSON-serialized string representation of item
   * @param {Object} item - The encoded model data
   * @returns {string} A JSON-encoded string
   */
  serialize(item) {
    return typeof item === 'object' && item ? JSON.stringify(item) : item;
  },

  /** Custom deserialization for data.
   * @param {string} data - JSON-encoded string
   * @returns {Object} The object result of parsing data
   */
  deserialize(data) {
    return JSON.parse(data);
  }
};

const revisionMap = {};

/** LocalStorage proxy class for Backbone models.
 * Usage:
 *   export const MyModel = Backbone.Model.extend({
 *     localStorage: new LocalStorage('MyModelName')
 *   });
 */
class LocalStorage {
  constructor(name = '', serializer = defaultSerializer) {
    this.name = name;
    this.serializer = serializer;
  }

  /** Return the global localStorage variable
   * @returns {Object} Local Storage reference.
   */
  localStorage() {
    return window.localStorage;
  }

  /** Returns the records associated with store
   * @returns {Array} The records.
   */
  getRecords() {
    if (!this.records || revisionMap[this.name] !== this.revision) {
      const store = this._getItem(this.name);
      this.revision = revisionMap[this.name];
      return (store && store.split(',')) || [];
    }
    return this.records;
  }

  /** Save the current status to localStorage
   * @returns {undefined}
   */
  save(records) {
    this._setItem(this.name, records.join(','));
    this.records = records;
    let revision = revisionMap[this.name];
    this.revision = revisionMap[this.name] = ++revision;
  }

  /** Add a new model with a unique GUID, if it doesn't already have its own ID
   * @param {Model} model - The Backbone Model to save to LocalStorage
   * @returns {Model} The saved model
   */
  create(model) {
    if (!model.id && model.id !== 0) {
      model.id = guid();
      model.set(model.idAttribute, model.id);
    }

    this._setItem(this._itemName(model.id), this.serializer.serialize(model));
    const records = this.getRecords();
    records.push(model.id.toString());
    this.save(records);

    return this.find(model);
  }

  /** Update an existing model in LocalStorage
   * @param {Model} model - The model to update
   * @returns {Model} The updated model
   */
  update(model) {
    this._setItem(this._itemName(model.id), this.serializer.serialize(model));

    const modelId = model.id.toString();
    const records = this.getRecords();

    if (!records.includes(modelId)) {
      records.push(modelId);
      this.save(records);
    }
    return this.find(model);
  }

  /** Retrieve a model from local storage by model id
   * @param {Model} model - The Backbone Model to lookup
   * @returns {Model} The model from LocalStorage
   */
  find(model) {
    return this.serializer.deserialize(this._getItem(this._itemName(model.id)));
  }

  /** Return all models from LocalStorage
   * @returns {Array} The array of models stored
   */
  findAll() {
    const records = this.getRecords();
    return records
      .map(id => this.serializer.deserialize(this._getItem(this._itemName(id))))
      .filter(item => item != null);
  }

  /** Delete a model from `this.data`, returning it.
   * @param {Model} model - Model to delete
   * @returns {Model} Model removed from this.data
   */
  destroy(model) {
    this._removeItem(this._itemName(model.id));
    const newRecords = this.getRecords().filter(item => item !== model);

    this.save(newRecords);

    return model;
  }

  /** Number of items in localStorage
   * @returns {integer} - Number of items
   */
  _storageSize() {
    return window.localStorage.length;
  }

  /** Return the item from localStorage
   * @param {string} name - Name to lookup
   * @returns {string} Value from localStorage
   */
  _getItem(name) {
    return window.localStorage.getItem(name);
  }

  /** Return the item name to lookup in localStorage
   * @param {integer} id - Item ID
   * @returns {string} Item name
   */
  _itemName(id) {
    return `${this.name}-${id}`;
  }

  /** Proxy to the localStorage setItem value method
   * @param {string} key - LocalStorage key to set
   * @param {string} value - LocalStorage value to set
   * @returns {undefined}
   */
  _setItem(key, value) {
    window.localStorage.setItem(key, value);
  }

  /** Proxy to the localStorage removeItem method
   * @param {string} key - LocalStorage key to remove
   * @returns {undefined}
   */
  _removeItem(key) {
    window.localStorage.removeItem(key);
  }
}

/** Returns the localStorage attribute for a model
 * @param {Model} model - Model to get localStorage
 * @returns {Storage} The localstorage
 */
function getLocalStorage(model) {
  return model.localStorage || (model.collection && model.collection.localStorage);
}

/** Override Backbone's `sync` method to run against localStorage
 * @param {string} method - One of read/create/update/delete
 * @param {Model} model - Backbone model to sync
 * @param {Object} options - Options object, use `ajaxSync: true` to run the
 *  operation against the server in which case, options will also be passed into
 *  `jQuery.ajax`
 * @returns {undefined}
 */
function localStorageSync(method, model, options) {
  const store = getLocalStorage(model);
  let resp, errorMessage;
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  try {
    switch (method) {
      case 'read':
        resp = typeof model.id === 'undefined' ? store.findAll() : store.find(model);
        break;
      case 'create':
        resp = store.create(model);
        break;
      case 'patch':
      case 'update':
        resp = store.update(model);
        break;
      case 'delete':
        resp = store.destroy(model);
        break;
    }
  } catch (error) {
    if (error.code === 22 && store._storageSize() === 0) {
      errorMessage = 'Private browsing is unsupported';
    } else {
      errorMessage = error.message;
    }
  }

  if (resp) {
    if (options.success) {
      options.success.call(model, resp, options);
    }
    resolve(resp);
  } else {
    errorMessage = errorMessage ? errorMessage : 'Record Not Found';

    if (options.error) {
      options.error.call(model, errorMessage, options);
    }
    reject(errorMessage);
  }

  // add compatibility with $.ajax
  // always execute callback for success and error
  if (options.complete) {
    options.complete.call(model, resp);
  }

  return promise;
}

const previousSync = sync.handler;

/** Get the local or ajax sync call
 * @param {Model} model - Model to sync
 * @param {object} options - Options to pass, takes ajaxSync
 * @returns {function} The sync method that will be called
 */
function getSyncMethod(model, options) {
  const forceAjaxSync = options.ajaxSync;
  const hasLocalStorage = getLocalStorage(model);

  return !forceAjaxSync && hasLocalStorage ? localStorageSync : previousSync;
}

sync.handler = function localStorageSyncHandler(method, model, options = {}) {
  const fn = getSyncMethod(model, options);
  return fn.call(this, method, model, options);
};

const createClass = (ModelClass, name, serializer) => {
  return class extends ModelClass {
    constructor(...args) {
      super(...args);
      this.localStorage = new LocalStorage(name, serializer);
    }
  };
};

export const localStorage = (name, serializer) => ctorOrDescriptor => {
  if (typeof ctorOrDescriptor === 'function') {
    return createClass(ctorOrDescriptor, name, serializer);
  }
  const { kind, elements } = ctorOrDescriptor;
  return {
    kind,
    elements,
    finisher(ctor) {
      return createClass(ctor, name, serializer);
    }
  };
};

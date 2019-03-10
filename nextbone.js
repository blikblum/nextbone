import {
  uniqueId,
  extend,
  once,
  result,
  defaults as getDefaults,
  escape,
  iteratee as createIteratee,
  isEqual,
  has,
  defer,
  invert,
  omit,
  pick,
  isString,
  isFunction,
  isRegExp,
  isObject,
  negate,
  invoke,
  max,
  min,
  first,
  initial,
  last,
  rest,
  without,
  difference,
  findLastIndex,
  shuffle,
  sample,
  partition,
  sortBy,
  countBy,
  indexBy,
  groupBy
} from 'underscore';

// Initial Setup
// -------------

// Create a local reference to a common array method we'll want to use later.
var slice = Array.prototype.slice;

// Underscore like functions
var keys = function(obj) {
  return obj ? Object.keys(obj) : [];
};

var clone = function(obj) {
  return Object.assign({}, obj);
};

var isArray = Array.isArray;

// Returns whether an object has a given set of `key:value` pairs.
var isMatch = function(object, attrs) {
  var objKeys = keys(attrs),
    length = objKeys.length;
  if (object == null) return !length;
  var obj = Object(object);
  for (var i = 0; i < length; i++) {
    var key = objKeys[i];
    if (attrs[key] !== obj[key] || !(key in obj)) return false;
  }
  return true;
};

var isObjectEmpty = function(obj) {
  return obj == null || Object.keys(obj).length === 0;
};

var matches = function(attrs) {
  attrs = Object.assign({}, attrs);
  return function(obj) {
    return isMatch(obj, attrs);
  };
};

// try to get a prop from instance, with fallback to constructor (class property)
var getClassProp = function(obj, prop) {
  var value = obj[prop];
  return typeof value === 'function' ? value.call(obj) : value ? value : obj.constructor[prop];
};

// Backbone.Events
// ---------------

// A class to provide a custom event channel. You may bind a callback to an event with `on` or
// remove with `off`; `trigger`-ing an event fires all callbacks in succession.
// It can be be also mixed in to *any object* in order
//     var object = {};
//     Backbone.Events.extend(object);
//     object.on('expand', function(){ alert('expanded'); });
//     object.trigger('expand');
//

// Regular expression used to split event strings.
var eventSplitter = /\s+/;

// A private global variable to share between listeners and listenees.
var _listening;

// Iterates over the standard `event, callback` (as well as the fancy multiple
// space-separated events `"change blur", callback` and jQuery-style event
// maps `{event: callback}`).
var eventsApi = function(iteratee, events, name, callback, opts) {
  var i = 0,
    names;
  if (name && typeof name === 'object') {
    // Handle event maps.
    if (callback !== void 0 && 'context' in opts && opts.context === void 0)
      opts.context = callback;
    for (names = keys(name); i < names.length; i++) {
      events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
    }
  } else if (name && eventSplitter.test(name)) {
    // Handle space-separated event names by delegating them individually.
    for (names = name.split(eventSplitter); i < names.length; i++) {
      events = iteratee(events, names[i], callback, opts);
    }
  } else {
    // Finally, standard events.
    events = iteratee(events, name, callback, opts);
  }
  return events;
};

// The reducing API that adds a callback to the `events` object.
var onApi = function(events, name, callback, options) {
  if (callback) {
    var handlers = events[name] || (events[name] = []);
    var context = options.context,
      ctx = options.ctx,
      listening = options.listening;
    if (listening) listening.count++;

    handlers.push({
      callback: callback,
      context: context,
      ctx: context || ctx,
      listening: listening
    });
  }
  return events;
};

// An try-catch guarded #on function, to prevent poisoning the global
// `_listening` variable.
var tryCatchOn = function(obj, name, callback, context) {
  try {
    obj.on(name, callback, context);
  } catch (e) {
    return e;
  }
};

// The reducing API that removes a callback from the `events` object.
var offApi = function(events, name, callback, options) {
  if (!events) return;

  var context = options.context,
    listeners = options.listeners;
  var i = 0,
    names;

  // Delete all event listeners and "drop" events.
  if (!name && !context && !callback) {
    for (names = keys(listeners); i < names.length; i++) {
      listeners[names[i]].cleanup();
    }
    return;
  }

  names = name ? [name] : keys(events);
  for (; i < names.length; i++) {
    name = names[i];
    var handlers = events[name];

    // Bail out if there are no events stored.
    if (!handlers) break;

    // Find any remaining events.
    var remaining = [];
    for (var j = 0; j < handlers.length; j++) {
      var handler = handlers[j];
      if (
        (callback && callback !== handler.callback && callback !== handler.callback._callback) ||
        (context && context !== handler.context)
      ) {
        remaining.push(handler);
      } else {
        var listening = handler.listening;
        if (listening) listening.off(name, callback);
      }
    }

    // Replace events if there are any remaining.  Otherwise, clean up.
    if (remaining.length) {
      events[name] = remaining;
    } else {
      delete events[name];
    }
  }

  return events;
};

// Reduces the event callbacks into a map of `{event: onceWrapper}`.
// `offer` unbinds the `onceWrapper` after it has been called.
var onceMap = function(map, name, callback, offer) {
  if (callback) {
    var fn = (map[name] = once(function() {
      offer(name, fn);
      callback.apply(this, arguments);
    }));
    fn._callback = callback;
  }
  return map;
};

// Handles triggering the appropriate event callbacks.
var triggerApi = function(objEvents, name, callback, args) {
  if (objEvents) {
    var events = objEvents[name];
    var allEvents = objEvents.all;
    if (events && allEvents) allEvents = allEvents.slice();
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, [name].concat(args));
  }
  return objEvents;
};

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
var triggerEvents = function(events, args) {
  var ev,
    i = -1,
    l = events.length,
    a1 = args[0],
    a2 = args[1],
    a3 = args[2];
  switch (args.length) {
    case 0:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx);
      return;
    case 1:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1);
      return;
    case 2:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2);
      return;
    case 3:
      while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
      return;
    default:
      while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
      return;
  }
};

var eventsMethods = ['on', 'listenTo', 'off', 'stopListening', 'once', 'listenToOnce', 'trigger'];

class Events {
  // Extend an object with Events methods
  static extend(obj) {
    eventsMethods.forEach(method => {
      obj[method] = Events.prototype[method];
    });
    return obj;
  }

  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on(name, callback, context) {
    this._events = eventsApi(onApi, this._events || {}, name, callback, {
      context: context,
      ctx: this,
      listening: _listening
    });

    if (_listening) {
      var listeners = this._listeners || (this._listeners = {});
      listeners[_listening.id] = _listening;
      // Allow the listening to use a counter, instead of tracking
      // callbacks for library interop
      _listening.interop = false;
    }

    return this;
  }

  // Inversion-of-control versions of `on`. Tell *this* object to listen to
  // an event in another object... keeping track of what it's listening to
  // for easier unbinding later.
  listenTo(obj, name, callback) {
    if (!obj) return this;
    var id = obj._listenId || (obj._listenId = uniqueId('l'));
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var listening = (_listening = listeningTo[id]);

    // This object is not listening to any other events on `obj` yet.
    // Setup the necessary references to track the listening callbacks.
    if (!listening) {
      this._listenId || (this._listenId = uniqueId('l'));
      listening = _listening = listeningTo[id] = new Listening(this, obj);
    }

    // Bind callbacks on obj.
    var error = tryCatchOn(obj, name, callback, this);
    _listening = void 0;

    if (error) throw error;
    // If the target obj is not Backbone.Events, track events manually.
    if (listening.interop) listening.on(name, callback);

    return this;
  }

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off(name, callback, context) {
    if (!this._events) return this;
    this._events = eventsApi(offApi, this._events, name, callback, {
      context: context,
      listeners: this._listeners
    });

    return this;
  }

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) return this;

    var ids = obj ? [obj._listenId] : keys(listeningTo);
    for (var i = 0; i < ids.length; i++) {
      var listening = listeningTo[ids[i]];

      // If listening doesn't exist, this object is not currently
      // listening to obj. Break out early.
      if (!listening) break;

      listening.obj.off(name, callback, this);
      if (listening.interop) listening.off(name, callback);
    }
    if (isObjectEmpty(listeningTo)) this._listeningTo = void 0;

    return this;
  }

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, its listener will be removed. If multiple events
  // are passed in using the space-separated syntax, the handler will fire
  // once for each event, not once for a combination of all events.
  once(name, callback, context) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.off.bind(this));
    if (typeof name === 'string' && context == null) callback = void 0;
    return this.on(events, callback, context);
  }

  // Inversion-of-control versions of `once`.
  listenToOnce(obj, name, callback) {
    // Map the event into a `{event: once}` object.
    var events = eventsApi(onceMap, {}, name, callback, this.stopListening.bind(this, obj));
    return this.listenTo(obj, events);
  }

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger(name) {
    if (!this._events) return this;

    var length = Math.max(0, arguments.length - 1);
    var args = Array(length);
    for (var i = 0; i < length; i++) args[i] = arguments[i + 1];

    eventsApi(triggerApi, this._events, name, void 0, args);
    return this;
  }
}

// A listening class that tracks and cleans up memory bindings
// when all callbacks have been offed.
class Listening {
  constructor(listener, obj) {
    this.id = listener._listenId;
    this.listener = listener;
    this.obj = obj;
    this.interop = true;
    this.count = 0;
    this._events = void 0;
  }

  // Offs a callback (or several).
  // Uses an optimized counter if the listenee uses Backbone.Events.
  // Otherwise, falls back to manual tracking to support events
  // library interop.

  off(name, callback) {
    var cleanup;
    if (this.interop) {
      this._events = eventsApi(offApi, this._events, name, callback, {
        context: void 0,
        listeners: void 0
      });
      cleanup = !this._events;
    } else {
      this.count--;
      cleanup = this.count === 0;
    }
    if (cleanup) this.cleanup();
  }

  // Cleans up memory bindings between the listener and the listenee.
  cleanup() {
    delete this.listener._listeningTo[this.obj._listenId];
    if (!this.interop) delete this.obj._listeners[this.id];
  }
}

Listening.prototype.on = Events.prototype.on;

// Backbone.Model
// --------------

// Backbone **Models** are the basic data object in the framework --
// frequently representing a row in a table in a database on your server.
// A discrete chunk of data and a bunch of useful, related methods for
// performing computations and transformations on that data.

// Create a new model with the specified attributes. A client id (`cid`)
// is automatically generated and assigned for you.

class Model extends Events {
  // The default name for the JSON `id` attribute is `"id"`. MongoDB and
  // CouchDB users may want to set this to `"_id"`.
  // static idAttribute = 'id';

  // The prefix is used to create the client id which is used to identify models locally.
  // You may want to override this if you're experiencing name clashes with model ids.
  // static cidPrefix = 'c';

  constructor(attributes, options) {
    super();
    // The value returned during the last failed validation.
    this.validationError = null;
    var attrs = attributes || {};
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    this.cid = uniqueId(this.constructor.cidPrefix || 'c');
    this.attributes = {};
    if (options.collection) this.collection = options.collection;
    if (options.parse) attrs = this.parse(attrs, options) || {};
    var defaults = getClassProp(this, 'defaults');
    attrs = getDefaults(extend({}, defaults, attrs), defaults);
    this.set(attrs, options);
    // A hash of attributes whose current and previous value differ.
    this.changed = {};
    this.initialize.apply(this, arguments);
  }

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Model.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // Return a copy of the model's `attributes` object.
  toJSON(options) {
    return clone(this.attributes);
  }

  // Get the Model class idAttribute. Read only.
  get idAttribute() {
    return this.constructor.idAttribute || 'id';
  }

  // Proxy `Backbone.sync` by default -- but override this if you need
  // custom syncing semantics for *this* particular model.
  sync() {
    return sync.handler.apply(this, arguments);
  }

  // Get the value of an attribute.
  get(attr) {
    return this.attributes[attr];
  }

  // Get the HTML-escaped value of an attribute.
  escape(attr) {
    return escape(this.get(attr));
  }

  // Returns `true` if the attribute contains a value that is not null
  // or undefined.
  has(attr) {
    return this.get(attr) != null;
  }

  // Special-cased proxy to underscore's `matches` method.
  matches(attrs) {
    return !!createIteratee(attrs, this)(this.attributes);
  }

  // Set a hash of model attributes on the object, firing `"change"`. This is
  // the core primitive operation of a model, updating the data and notifying
  // anyone who needs to know about the change in state. The heart of the beast.
  set(key, val, options) {
    if (key == null) return this;

    // Handle both `"key", value` and `{key: value}` -style arguments.
    var attrs;
    if (typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options || (options = {});

    // Run validation.
    this._validate(attrs, options);

    // Extract attributes and options.
    var unset = options.unset;
    var silent = options.silent;
    var reset = options.reset;
    var changes = [];
    var changing = this._changing;
    this._changing = true;

    if (!changing) {
      this._previousAttributes = clone(this.attributes);
      this.changed = {};
    }

    var current = this.attributes;
    var changed = this.changed;
    var prev = this._previousAttributes;

    // For each `set` attribute, update or delete the current value.
    for (var attr in attrs) {
      val = attrs[attr];
      if (!isEqual(current[attr], val)) changes.push(attr);
      if (!isEqual(prev[attr], val)) {
        changed[attr] = val;
      } else {
        delete changed[attr];
      }
      unset ? delete current[attr] : (current[attr] = val);
    }

    if (reset) {
      for (var currAttr in current) {
        if (!(currAttr in attrs)) {
          delete current[currAttr];
          changes.push(currAttr);
          changed[currAttr] = void 0;
        }
      }
    }

    // Update the `id`.
    var idAttribute = this.constructor.idAttribute || 'id';
    if (idAttribute in attrs) this.id = this.get(idAttribute);

    // Trigger all relevant attribute changes.
    if (!silent) {
      if (changes.length) this._pending = options;
      for (var i = 0; i < changes.length; i++) {
        this.trigger('change:' + changes[i], this, current[changes[i]], options);
      }
    }

    // You might be wondering why there's a `while` loop here. Changes can
    // be recursively nested within `"change"` events.
    if (changing) return this;
    if (!silent) {
      while (this._pending) {
        options = this._pending;
        this._pending = false;
        this.trigger('change', this, options);
      }
    }
    this._pending = false;
    this._changing = false;
    return this;
  }

  // Remove an attribute from the model, firing `"change"`. `unset` is a noop
  // if the attribute doesn't exist.
  unset(attr, options) {
    return this.set(attr, void 0, extend({}, options, { unset: true }));
  }

  // Clear all attributes on the model, firing `"change"`.
  clear(options) {
    var attrs = {};
    for (var key in this.attributes) attrs[key] = void 0;
    return this.set(attrs, extend({}, options, { unset: true }));
  }

  // Determine if the model has changed since the last `"change"` event.
  // If you specify an attribute name, determine if that attribute has changed.
  hasChanged(attr) {
    if (attr == null) return !isObjectEmpty(this.changed);
    return has(this.changed, attr);
  }

  // Return an object containing all the attributes that have changed, or
  // false if there are no changed attributes. Useful for determining what
  // parts of a view need to be updated and/or what attributes need to be
  // persisted to the server. Unset attributes will be set to undefined.
  // You can also pass an attributes object to diff against the model,
  // determining if there *would be* a change.
  changedAttributes(diff) {
    if (!diff) return this.hasChanged() ? clone(this.changed) : false;
    var old = this._changing ? this._previousAttributes : this.attributes;
    var changed = {};
    var hasChanged;
    for (var attr in diff) {
      var val = diff[attr];
      if (isEqual(old[attr], val)) continue;
      changed[attr] = val;
      hasChanged = true;
    }
    return hasChanged ? changed : false;
  }

  // Get the previous value of an attribute, recorded at the time the last
  // `"change"` event was fired.
  previous(attr) {
    if (attr == null || !this._previousAttributes) return null;
    return this._previousAttributes[attr];
  }

  // Get all of the attributes of the model at the time of the previous
  // `"change"` event.
  previousAttributes() {
    return clone(this._previousAttributes);
  }

  // Fetch the model from the server, merging the response with the model's
  // local attributes. Any changed attributes will trigger a "change" event.
  fetch(options) {
    options = extend({ parse: true }, options);
    var model = this;
    var success = options.success;
    options.success = function(resp) {
      var serverAttrs = options.parse ? model.parse(resp, options) : resp;
      if (!model.set(serverAttrs, options)) return false;
      if (success) success.call(options.context, model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  }

  // Set a hash of model attributes, and sync the model to the server.
  // If the server returns an attributes hash that differs, the model's
  // state will be `set` again.
  save(key, val, options) {
    // Handle both `"key", value` and `{key: value}` -style arguments.
    var attrs;
    if (key == null || typeof key === 'object') {
      attrs = key;
      options = val;
    } else {
      (attrs = {})[key] = val;
    }

    options = extend({ validate: true, parse: true }, options);
    var wait = options.wait;

    // If we're not waiting and attributes exist, save acts as
    // `set(attr).save(null, opts)` with validation. Otherwise, check if
    // the model will be valid when the attributes, if any, are set.
    if (attrs && !wait) {
      this.set(attrs, options);
      if (this.validationError) return false;
    } else if (!this._validate(attrs, options)) {
      return false;
    }

    // After a successful server-side save, the client is (optionally)
    // updated with the server-side state.
    var model = this;
    var success = options.success;
    var attributes = this.attributes;
    options.success = function(resp) {
      // Ensure attributes are restored during synchronous saves.
      model.attributes = attributes;
      var serverAttrs = options.parse ? model.parse(resp, options) : resp;
      if (wait) serverAttrs = extend({}, attrs, serverAttrs);
      if (serverAttrs && !model.set(serverAttrs, options)) return false;
      if (success) success.call(options.context, model, resp, options);
      model.trigger('sync', model, resp, options);
    };
    wrapError(this, options);

    // Set temporary attributes if `{wait: true}` to properly find new ids.
    if (attrs && wait) this.attributes = extend({}, attributes, attrs);

    var method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';
    if (method === 'patch' && !options.attrs) options.attrs = attrs;
    var xhr = this.sync(method, this, options);

    // Restore attributes.
    this.attributes = attributes;

    return xhr;
  }

  // Destroy this model on the server if it was already persisted.
  // Optimistically removes the model from its collection, if it has one.
  // If `wait: true` is passed, waits for the server to respond before removal.
  destroy(options) {
    options = options ? clone(options) : {};
    var model = this;
    var success = options.success;
    var wait = options.wait;

    var destroy = function() {
      model.stopListening();
      model.trigger('destroy', model, model.collection, options);
    };

    options.success = function(resp) {
      if (wait) destroy();
      if (success) success.call(options.context, model, resp, options);
      if (!model.isNew()) model.trigger('sync', model, resp, options);
    };

    var xhr = false;
    if (this.isNew()) {
      defer(options.success);
    } else {
      wrapError(this, options);
      xhr = this.sync('delete', this, options);
    }
    if (!wait) destroy();
    return xhr;
  }

  // Default URL for the model's representation on the server -- if you're
  // using Backbone's restful methods, override this to change the endpoint
  // that will be called.
  url() {
    var base = result(this, 'urlRoot') || result(this.collection, 'url') || urlError();
    if (this.isNew()) return base;
    var id = this.get(this.constructor.idAttribute || 'id');
    return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id);
  }

  // **parse** converts a response into the hash of attributes to be `set` on
  // the model. The default implementation is just to pass the response along.
  parse(resp, options) {
    return resp;
  }

  // Create a new model with identical attributes to this one.
  clone() {
    return new this.constructor(this.attributes);
  }

  // A model is new if it has never been saved to the server, and lacks an id.
  isNew() {
    return !this.has(this.constructor.idAttribute || 'id');
  }

  // Check if the model is currently in a valid state.
  isValid(options) {
    return this._validate({}, extend({}, options, { validate: true }));
  }

  // underscore methods
  keys() {
    return keys(this.attributes);
  }

  values() {
    return Object.values(this.attributes);
  }

  pairs() {
    return Object.entries(this.attributes);
  }

  entries() {
    return Object.entries(this.attributes);
  }

  invert() {
    return invert(this.attributes);
  }

  pick(...args) {
    return pick(this.attributes, ...args);
  }

  omit(...args) {
    return omit(this.attributes, ...args);
  }

  isEmpty() {
    return isObjectEmpty(this.attributes);
  }

  // Run validation against the next complete set of model attributes,
  // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
  _validate(attrs, options) {
    if (!options.validate || !this.validate) return true;
    attrs = extend({}, this.attributes, attrs);
    var error = (this.validationError = this.validate(attrs, options) || null);
    if (!error) return true;
    this.trigger('invalid', this, error, options);
    return false;
  }
}

// Defining an @@iterator method implements JavaScript's Iterable protocol.
// This value is found at Symbol.iterator.
/* global Symbol */
var $$iterator = Symbol.iterator;

// Backbone.Collection
// -------------------

// If models tend to represent a single row of data, a Backbone Collection is
// more analogous to a table full of data ... or a small slice or page of that
// table, or a collection of rows that belong together for a particular reason
// -- all of the messages in this particular folder, all of the documents
// belonging to this particular author, and so on. Collections maintain
// indexes of their models, both in order, and for lookup by `id`.

// Create a new **Collection**, perhaps to contain a specific type of `model`.
// If a `comparator` is specified, the Collection will maintain
// its models in sort order, as they're added and removed.

class Collection extends Events {
  // The default model for a collection is just a **Backbone.Model**.
  // This should be overridden in most cases.
  // static model = Model;

  constructor(models, options) {
    super();
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, extend({ silent: true }, options));
  }

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Collection.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // The JSON representation of a Collection is an array of the
  // models' attributes.
  toJSON(options) {
    return this.map(function(model) {
      return model.toJSON(options);
    });
  }

  // Proxy `Backbone.sync` by default.
  sync() {
    return sync.handler.apply(this, arguments);
  }

  // Add a model, or list of models to the set. `models` may be Backbone
  // Models or raw JavaScript objects to be converted to Models, or any
  // combination of the two.
  add(models, options) {
    return this.set(models, extend({ merge: false }, options, addOptions));
  }

  // Remove a model, or a list of models from the set.
  remove(models, options) {
    options = extend({}, options);
    var singular = !isArray(models);
    models = singular ? [models] : models.slice();
    var removed = this._removeModels(models, options);
    if (!options.silent && removed.length) {
      options.changes = { added: [], merged: [], removed: removed };
      this.trigger('update', this, options);
    }
    return singular ? removed[0] : removed;
  }

  // Update a collection by `set`-ing a new list of models, adding new ones,
  // removing models that are no longer present, and merging models that
  // already exist in the collection, as necessary. Similar to **Model#set**,
  // the core operation for updating the data contained by the collection.
  set(models, options) {
    if (models == null) return;

    options = extend({}, setOptions, options);
    if (options.parse && !this._isModel(models)) {
      models = this.parse(models, options) || [];
    }

    var singular = !isArray(models);
    models = singular ? [models] : models.slice();

    var at = options.at;
    if (at != null) at = +at;
    if (at > this.length) at = this.length;
    if (at < 0) at += this.length + 1;

    var set = [];
    var toAdd = [];
    var toMerge = [];
    var toRemove = [];
    var modelMap = {};

    var add = options.add;
    var merge = options.merge;
    var remove = options.remove;

    var sort = false;
    var sortable = this.comparator && at == null && options.sort !== false;
    var sortAttr = isString(this.comparator) ? this.comparator : null;

    // Turn bare objects into model references, and prevent invalid models
    // from being added.
    var model, i;
    for (i = 0; i < models.length; i++) {
      model = models[i];

      // If a duplicate is found, prevent it from being added and
      // optionally merge it into the existing model.
      var existing = this.get(model);
      if (existing) {
        if (merge && model !== existing) {
          var attrs = this._isModel(model) ? model.attributes : model;
          if (options.parse) attrs = existing.parse(attrs, options);
          existing.set(attrs, options);
          toMerge.push(existing);
          if (sortable && !sort) sort = existing.hasChanged(sortAttr);
        }
        if (!modelMap[existing.cid]) {
          modelMap[existing.cid] = true;
          set.push(existing);
        }
        models[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
      } else if (add) {
        model = models[i] = this._prepareModel(model, options);
        if (model) {
          toAdd.push(model);
          this._addReference(model, options);
          modelMap[model.cid] = true;
          set.push(model);
        }
      }
    }

    // Remove stale models.
    if (remove) {
      for (i = 0; i < this.length; i++) {
        model = this.models[i];
        if (!modelMap[model.cid]) toRemove.push(model);
      }
      if (toRemove.length) this._removeModels(toRemove, options);
    }

    // See if sorting is needed, update `length` and splice in new models.
    var orderChanged = false;
    var replace = !sortable && add && remove;
    if (set.length && replace) {
      orderChanged =
        this.length !== set.length ||
        this.models.some(function(m, index) {
          return m !== set[index];
        });
      this.models.length = 0;
      splice(this.models, set, 0);
      this.length = this.models.length;
    } else if (toAdd.length) {
      if (sortable) sort = true;
      splice(this.models, toAdd, at == null ? this.length : at);
      this.length = this.models.length;
    }

    // Silently sort the collection if appropriate.
    if (sort) this.sort({ silent: true });

    // Unless silenced, it's time to fire all appropriate add/sort/update events.
    if (!options.silent) {
      for (i = 0; i < toAdd.length; i++) {
        if (at != null) options.index = at + i;
        model = toAdd[i];
        model.trigger('add', model, this, options);
      }
      if (sort || orderChanged) this.trigger('sort', this, options);
      if (toAdd.length || toRemove.length || toMerge.length) {
        options.changes = {
          added: toAdd,
          removed: toRemove,
          merged: toMerge
        };
        this.trigger('update', this, options);
      }
    }

    // Return the added (or merged) model (or models).
    return singular ? models[0] : models;
  }

  // When you have more items than you want to add or remove individually,
  // you can reset the entire set with a new list of models, without firing
  // any granular `add` or `remove` events. Fires `reset` when finished.
  // Useful for bulk operations and optimizations.
  reset(models, options) {
    options = options ? clone(options) : {};
    for (var i = 0; i < this.models.length; i++) {
      this._removeReference(this.models[i], options);
    }
    options.previousModels = this.models;
    this._reset();
    models = this.add(models, extend({ silent: true }, options));
    if (!options.silent) this.trigger('reset', this, options);
    return models;
  }

  // Add a model to the end of the collection.
  push(model, options) {
    return this.add(model, extend({ at: this.length }, options));
  }

  // Remove a model from the end of the collection.
  pop(options) {
    var model = this.at(this.length - 1);
    return this.remove(model, options);
  }

  // Add a model to the beginning of the collection.
  unshift(model, options) {
    return this.add(model, extend({ at: 0 }, options));
  }

  // Remove a model from the beginning of the collection.
  shift(options) {
    var model = this.at(0);
    return this.remove(model, options);
  }

  // Slice out a sub-array of models from the collection.
  slice() {
    return slice.apply(this.models, arguments);
  }

  // Get a model from the set by id, cid, model object with id or cid
  // properties, or an attributes object that is transformed through modelId.
  get(obj) {
    if (obj == null) return void 0;
    return (
      this._byId[obj] ||
      this._byId[this.modelId(this._isModel(obj) ? obj.attributes : obj)] ||
      (obj.cid && this._byId[obj.cid])
    );
  }

  // Returns `true` if the model is in the collection.
  has(obj) {
    return this.get(obj) != null;
  }

  // Get the model at the given index.
  at(index) {
    if (index < 0) index += this.length;
    return this.models[index];
  }

  // Return models with matching attributes. Useful for simple cases of
  // `filter`.
  where(attrs, firstItem) {
    return this[firstItem ? 'find' : 'filter'](attrs);
  }

  // Return the first model with matching attributes. Useful for simple cases
  // of `find`.
  findWhere(attrs) {
    return this.where(attrs, true);
  }

  // Force the collection to re-sort itself. You don't need to call this under
  // normal circumstances, as the set will maintain sort order as each item
  // is added.
  sort(options) {
    var comparator = this.comparator;
    if (!comparator) throw new Error('Cannot sort a set without a comparator');
    options || (options = {});

    var length = comparator.length;
    if (isFunction(comparator)) comparator = comparator.bind(this);

    // Run sort based on type of `comparator`.
    if (length === 1 || isString(comparator)) {
      this.models = this.sortBy(comparator);
    } else {
      this.models.sort(comparator);
    }
    if (!options.silent) this.trigger('sort', this, options);
    return this;
  }

  // Pluck an attribute from each model in the collection.
  pluck(attr) {
    return this.map(attr + '');
  }

  // Fetch the default set of models for this collection, resetting the
  // collection when they arrive. If `reset: true` is passed, the response
  // data will be passed through the `reset` method instead of `set`.
  fetch(options) {
    options = extend({ parse: true }, options);
    var success = options.success;
    var collection = this;
    options.success = function(resp) {
      var method = options.reset ? 'reset' : 'set';
      collection[method](resp, options);
      if (success) success.call(options.context, collection, resp, options);
      collection.trigger('sync', collection, resp, options);
    };
    wrapError(this, options);
    return this.sync('read', this, options);
  }

  // Create a new instance of a model in this collection. Add the model to the
  // collection immediately, unless `wait: true` is passed, in which case we
  // wait for the server to agree.
  create(model, options) {
    options = options ? clone(options) : {};
    var wait = options.wait;
    model = this._prepareModel(model, options);
    if (!model) return false;
    if (!wait) this.add(model, options);
    var collection = this;
    var success = options.success;
    options.success = function(m, resp, callbackOpts) {
      if (wait) collection.add(m, callbackOpts);
      if (success) success.call(callbackOpts.context, m, resp, callbackOpts);
    };
    model.save(null, options);
    return model;
  }

  // **parse** converts a response into a list of models to be added to the
  // collection. The default implementation is just to pass it through.
  parse(resp, options) {
    return resp;
  }

  // Create a new collection with an identical list of models as this one.
  clone() {
    return new this.constructor(this.models, {
      model: this.model,
      comparator: this.comparator
    });
  }

  // Define how to uniquely identify models in the collection.
  modelId(attrs) {
    var model = this.model || this.constructor.model || Model;
    return attrs[(model && model.idAttribute) || 'id'];
  }

  // Get an iterator of all models in this collection.
  values() {
    return new CollectionIterator(this, ITERATOR_VALUES);
  }

  // Get an iterator of all model IDs in this collection.
  keys() {
    return new CollectionIterator(this, ITERATOR_KEYS);
  }

  // Get an iterator of all [ID, model] tuples in this collection.
  entries() {
    return new CollectionIterator(this, ITERATOR_KEYSVALUES);
  }

  forEach(iteratee, context) {
    return this.models.forEach(iteratee, context);
  }

  each(iteratee, context) {
    return this.forEach(iteratee, context);
  }

  map(iteratee, context) {
    return this.models.map(cb(iteratee, this), context);
  }

  reduce(...args) {
    return this.models.reduce(...args);
  }

  reduceRight(...args) {
    return this.models.reduceRight(...args);
  }

  find(predicate, context) {
    return this.models.find(cb(predicate, this), context);
  }

  filter(predicate, context) {
    return this.models.filter(cb(predicate, this), context);
  }

  reject(predicate, context) {
    return this.models.filter(negate(cb(predicate, this)), context);
  }

  every(predicate, context) {
    return this.models.every(cb(predicate, this), context);
  }

  some(predicate, context) {
    return this.models.some(cb(predicate, this), context);
  }

  includes(value, fromIndex) {
    return this.models.includes(value, fromIndex);
  }

  contains(value, fromIndex) {
    return this.includes(value, fromIndex);
  }

  invoke(...args) {
    return invoke(this.models, ...args);
  }

  max(iteratee, context) {
    return max(this.models, cb(iteratee, this), context);
  }

  min(iteratee, context) {
    return min(this.models, cb(iteratee, this), context);
  }

  toArray() {
    return this.models.slice();
  }

  size() {
    return this.models.length;
  }

  first(n) {
    return first(this.models, n);
  }

  take(n) {
    return first(this.models, n);
  }

  initial(n) {
    return initial(this.models, n);
  }

  last(n) {
    return last(this.models, n);
  }

  rest(index) {
    return rest(this.models, index);
  }

  drop(index) {
    return rest(this.models, index);
  }

  without(...args) {
    return without(this.models, ...args);
  }

  difference(...args) {
    return difference(this.models, ...args);
  }

  indexOf(model, fromIndex) {
    return this.models.indexOf(model, fromIndex);
  }

  lastIndexOf(model, fromIndex) {
    return this.models.lastIndexOf(model, fromIndex);
  }

  findIndex(predicate, context) {
    return this.models.findIndex(cb(predicate, this), context);
  }

  findLastIndex(predicate, context) {
    return findLastIndex(this.models, cb(predicate, this), context);
  }

  shuffle() {
    return shuffle(this.models);
  }

  isEmpty() {
    return this.models.length === 0;
  }

  sample(n) {
    return sample(this.models, n);
  }

  partition(predicate) {
    return partition(this.models, cb(predicate, this));
  }

  groupBy(predicate, context) {
    return groupBy(this.models, cb(predicate, this), context);
  }

  indexBy(predicate, context) {
    return indexBy(this.models, cb(predicate, this), context);
  }

  sortBy(predicate, context) {
    return sortBy(this.models, cb(predicate, this), context);
  }

  countBy(predicate, context) {
    return countBy(this.models, cb(predicate, this), context);
  }

  [$$iterator]() {
    return this.values();
  }

  // Private method to reset all internal state. Called when the collection
  // is first initialized or reset.
  _reset() {
    this.length = 0;
    this.models = [];
    this._byId = {};
  }

  // Prepare a hash of attributes (or other model) to be added to this
  // collection.
  _prepareModel(attrs, options) {
    if (this._isModel(attrs)) {
      if (!attrs.collection) attrs.collection = this;
      return attrs;
    }
    options = options ? clone(options) : {};
    options.collection = this;
    var modelClass = this.model || this.constructor.model || Model;
    var model =
      modelClass.prototype instanceof Model || modelClass === Model
        ? new modelClass(attrs, options)
        : modelClass(attrs, options);
    if (!model.validationError) return model;
    this.trigger('invalid', this, model.validationError, options);
    return false;
  }

  // Internal method called by both remove and set.
  _removeModels(models, options) {
    var removed = [];
    for (var i = 0; i < models.length; i++) {
      var model = this.get(models[i]);
      if (!model) continue;

      var index = this.indexOf(model);
      this.models.splice(index, 1);
      this.length--;

      // Remove references before triggering 'remove' event to prevent an
      // infinite loop. #3693
      delete this._byId[model.cid];
      var id = this.modelId(model.attributes);
      if (id != null) delete this._byId[id];

      if (!options.silent) {
        options.index = index;
        model.trigger('remove', model, this, options);
      }

      removed.push(model);
      this._removeReference(model, options);
    }
    return removed;
  }

  // Method for checking whether an object should be considered a model for
  // the purposes of adding to the collection.
  _isModel(model) {
    return model instanceof Model;
  }

  // Internal method to create a model's ties to a collection.
  _addReference(model, options) {
    this._byId[model.cid] = model;
    var id = this.modelId(model.attributes);
    if (id != null) this._byId[id] = model;
    model.on('all', this._onModelEvent, this);
  }

  // Internal method to sever a model's ties to a collection.
  _removeReference(model, options) {
    delete this._byId[model.cid];
    var id = this.modelId(model.attributes);
    if (id != null) delete this._byId[id];
    if (this === model.collection) delete model.collection;
    model.off('all', this._onModelEvent, this);
  }

  // Internal method called every time a model in the set fires an event.
  // Sets need to update their indexes when models change ids. All other
  // events simply proxy through. "add" and "remove" events that originate
  // in other collections are ignored.
  _onModelEvent(event, model, collection, options) {
    if (model) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (event === 'change') {
        var prevId = this.modelId(model.previousAttributes());
        var id = this.modelId(model.attributes);
        if (prevId !== id) {
          if (prevId != null) delete this._byId[prevId];
          if (id != null) this._byId[id] = model;
        }
      }
    }
    this.trigger.apply(this, arguments);
  }
}

// Default options for `Collection#set`.
var setOptions = { add: true, remove: true, merge: true };
var addOptions = { add: true, remove: false };

// Splices `insert` into `array` at index `at`.
var splice = function(array, insert, at) {
  at = Math.min(Math.max(at, 0), array.length);
  var tail = Array(array.length - at);
  var length = insert.length;
  var i;
  for (i = 0; i < tail.length; i++) tail[i] = array[i + at];
  for (i = 0; i < length; i++) array[i + at] = insert[i];
  for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i];
};

// This "enum" defines the three possible kinds of values which can be emitted
// by a CollectionIterator that correspond to the values(), keys() and entries()
// methods on Collection, respectively.
var ITERATOR_VALUES = 1;
var ITERATOR_KEYS = 2;
var ITERATOR_KEYSVALUES = 3;

// CollectionIterator
// ------------------

// A CollectionIterator implements JavaScript's Iterator protocol, allowing the
// use of `for of` loops in modern browsers and interoperation between
// Backbone.Collection and other JavaScript functions and third-party libraries
// which can operate on Iterables.
class CollectionIterator {
  constructor(collection, kind) {
    this._collection = collection;
    this._kind = kind;
    this._index = 0;
  }

  next() {
    if (this._collection) {
      // Only continue iterating if the iterated collection is long enough.
      if (this._index < this._collection.length) {
        var model = this._collection.at(this._index);
        this._index++;

        // Construct a value depending on what kind of values should be iterated.
        var value;
        if (this._kind === ITERATOR_VALUES) {
          value = model;
        } else {
          var id = this._collection.modelId(model.attributes);
          if (this._kind === ITERATOR_KEYS) {
            value = id;
          } else {
            // ITERATOR_KEYSVALUES
            value = [id, model];
          }
        }
        return { value: value, done: false };
      }

      // Once exhausted, remove the reference to the collection so future
      // calls to the next method always return done.
      this._collection = void 0;
    }

    return { value: void 0, done: true };
  }

  // All Iterators should themselves be Iterable.
  [$$iterator]() {
    return this;
  }
}

// Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
var cb = function(iteratee, instance) {
  if (isFunction(iteratee)) return iteratee;
  if (isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
  if (isString(iteratee))
    return function(model) {
      return model.get(iteratee);
    };
  return iteratee;
};

var modelMatcher = function(attrs) {
  var matcher = matches(attrs);
  return function(model) {
    return matcher(model.attributes);
  };
};

// Backbone.view
// -------------

// Set of decorators to custom elements based on lit-element base class

const isClassDecorated = Symbol();

// Make a event delegation handler for the given `eventName` and `selector`
// and attach it to `el`.
// If selector is empty, the listener will be bound to `el`. If not, a
// new handler that will recursively traverse up the event target's DOM
// hierarchy looking for a node that matches the selector. If one is found,
// the event's `delegateTarget` property is set to it and the return the
// result of calling bound `listener` with the parameters given to the
// handler.

const delegate = function(el, eventName, selector, listener) {
  if (delegate.$) return $delegate(el, eventName, selector, listener, delegate.$);

  let handler, eventTarget;
  if (selector) {
    eventTarget = el.renderRoot || el;
    handler = function(e) {
      var node = e.target;
      for (; node && node !== el; node = node.parentNode) {
        if (node.matches && node.matches(selector)) {
          e.selectorTarget = node;
          listener.call(el, e);
        }
      }
    };
  } else {
    eventTarget = el;
    handler = listener.bind(el);
  }
  eventTarget.addEventListener(eventName, handler, false);
  return handler;
};

// jquery version of delegate
const $delegate = function(el, eventName, selector, listener, $) {
  let handler;
  if (selector) {
    handler = function(e) {
      e.selectorTarget = e.currentTarget;
      listener.call(el, e);
    };
    $(el.renderRoot || el).on(eventName, selector, handler);
  } else {
    handler = listener.bind(el);
    $(el).on(eventName, handler);
  }
  return handler;
};

const undelegate = function(el, eventName, handler) {
  const eventTarget = !(handler.name === 'handler') ? el : el.renderRoot || el;
  if (!delegate.$) {
    eventTarget.removeEventListener(eventName, handler, false);
  } else {
    delegate.$(eventTarget).off(eventName, handler);
  }
};

const bindViewState = (el, value) => {
  if (value instanceof Model) {
    el.listenTo(value, 'change', () => el.requestUpdate());
  } else if (value instanceof Collection) {
    el.listenTo(value, 'sort update reset change', () => el.requestUpdate());
  }
};

const isSpecDecoratorCall = args => {
  const descriptorKind = args[0].kind;
  return (
    args.length === 1 &&
    (descriptorKind === 'field' || descriptorKind === 'method' || descriptorKind === 'class')
  );
};

const registerDelegatedEvent = (ctor, eventName, selector, listener) => {
  const classEvents = ctor.__events || (ctor.__events = []);
  classEvents.push({ eventName, selector, listener });
};

const registerStateProperty = (ctor, name, key) => {
  const classStates = ctor.__states || (ctor.__states = new Set());
  classStates.add(name);
  const desc = {
    get() {
      return this[key];
    },
    set(value) {
      const oldValue = this[key];
      if (value === oldValue) return;
      if (this.isConnected) {
        bindViewState(this, value);
      }
      if (oldValue instanceof Model || oldValue instanceof Collection) {
        this.stopListening(oldValue);
      }
      this[key] = value;
      this.requestUpdate(name, oldValue);
    },
    configurable: true,
    enumerable: true
  };
  Object.defineProperty(ctor.prototype, name, desc);
  if (ctor.createProperty) {
    ctor.createProperty(name, { type: Object, noAccessor: true });
  }
};

const ensureViewClass = ElementClass => {
  if (ElementClass[isClassDecorated]) return ElementClass;
  ElementClass[isClassDecorated] = true;
  class ViewClass extends ElementClass {
    constructor() {
      super();
      const events = this.constructor.__events;
      if (events) {
        events.forEach(({ eventName, selector, listener }) => {
          delegate(this, eventName, selector, listener);
        });
      }
    }

    connectedCallback() {
      super.connectedCallback && super.connectedCallback();
      const states = this.constructor.__states;
      if (states) {
        states.forEach(name => {
          bindViewState(this, this[name]);
        });
      }
    }

    disconnectedCallback() {
      this.stopListening();
      super.disconnectedCallback && super.disconnectedCallback();
    }
  }
  Events.extend(ViewClass.prototype);
  return ViewClass;
};

// Method decorator to register a delegated event
const event = (eventName, selector) => (...args) => {
  if (isSpecDecoratorCall(args)) {
    const { kind, key, placement, descriptor, initializer } = args[0];
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher(ctor) {
        registerDelegatedEvent(ctor, eventName, selector, descriptor.value);
        return ensureViewClass(ctor);
      }
    };
  }
  // args[0]: target, args[1]: name, args[2]: descriptor
  registerDelegatedEvent(args[0].constructor, eventName, selector, args[2].value);
};

// Method decorator to define an observable model/collection to a property
const state = (...args) => {
  const isSpec = isSpecDecoratorCall(args);
  const name = isSpec ? args[0].key : args[1];
  const key = typeof name === 'symbol' ? Symbol() : `__${name}`;
  if (isSpec) {
    const { kind, placement, descriptor, initializer } = args[0];
    return {
      kind,
      placement,
      descriptor,
      initializer,
      key,
      finisher(ctor) {
        registerStateProperty(ctor, name, key);
        return ensureViewClass(ctor);
      }
    };
  }
  registerStateProperty(args[0].constructor, name, key);
};

// Custom element decorator
const view = (...args) => {
  if (isSpecDecoratorCall(args)) {
    const { kind, elements } = args[0];
    return {
      kind,
      elements,
      finisher: ensureViewClass
    };
  }
  return ensureViewClass(args[0]);
};

// ES class Events mixin / decorator
const withEvents = (...args) => {
  if (isSpecDecoratorCall(args)) {
    const { kind, elements } = args[0];
    return {
      kind,
      elements,
      finisher(BaseClass) {
        Events.extend(BaseClass.prototype);
      }
    };
  }
  const WithEventsClass = class extends args[0] {};
  Events.extend(WithEventsClass.prototype);
  return WithEventsClass;
};

// Backbone.sync
// -------------

// Override this function to change the manner in which Backbone persists
// models to the server. You will be passed the type of request, and the
// model in question. By default, makes a RESTful Ajax request
// to the model's `url()`. Some possible customizations could be:
//
// * Use `setTimeout` to batch rapid-fire updates into a single request.
// * Send up the models as XML instead of JSON.
// * Persist models via WebSockets instead of Ajax.

// Map from CRUD to HTTP for our default `Backbone.sync` implementation.
var methodMap = {
  create: 'POST',
  update: 'PUT',
  patch: 'PATCH',
  delete: 'DELETE',
  read: 'GET'
};

var sync = {
  handler: function(method, model, options) {
    var type = methodMap[method];

    options || (options = {});

    // Default JSON-request options.
    var params = { type: type, dataType: 'json' };

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (
      options.data == null &&
      model &&
      (method === 'create' || method === 'update' || method === 'patch')
    ) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET') {
      params.processData = false;
    }

    // Pass along `textStatus` and `errorThrown` from jQuery.
    var error = options.error;
    options.error = function(xhr, textStatus, errorThrown) {
      options.textStatus = textStatus;
      options.errorThrown = errorThrown;
      if (error) error.call(options.context, xhr, textStatus, errorThrown);
    };

    // Make the request, allowing the user to override any Ajax options.
    var xhr = (options.xhr = ajax.handler(extend(params, options)));
    model.trigger('request', model, xhr, options);
    return xhr;
  }
};

// Backbone.ajax
// -------------

// Default implementation based on `fetch` API

var stringifyGETParams = function(url, data) {
  var query = '';
  for (var key in data) {
    if (data[key] == null) continue;
    query += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(data[key]);
  }
  if (query) url += (~url.indexOf('?') ? '&' : '?') + query.substring(1);
  return url;
};

var getData = function(response, dataType) {
  return dataType === 'json' ? response.json() : response.text();
};

// Override handler method to customize ajax functionality.
var ajax = {
  handler: function(options) {
    if (options.type === 'GET' && typeof options.data === 'object') {
      options.url = stringifyGETParams(options.url, options.data);
      delete options.data;
    }

    getDefaults(options, {
      method: options.type,
      headers: getDefaults(options.headers || {}, {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }),
      body: options.data
    });

    return fetch(options.url, options)
      .then(function(response) {
        var promise = getData(response, options.dataType);

        if (response.ok) return promise;

        var error = new Error(response.statusText);
        return promise.then(function(responseData) {
          error.response = response;
          error.responseData = responseData;
          if (options.error) options.error(error);
          throw error;
        });
      })
      .then(function(responseData) {
        if (options.success) options.success(responseData);
        return responseData;
      });
  }
};

// Backbone.Router
// ---------------

// Routers map faux-URLs to actions, and fire events when routes are
// matched. Creating a new one sets its `routes` hash, if not set statically.

class Router extends Events {
  constructor(options) {
    super();
    options || (options = {});
    this.preinitialize.apply(this, arguments);
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  }

  // preinitialize is an empty function by default. You can override it with a function
  // or object.  preinitialize will run before any instantiation logic is run in the Router.
  preinitialize() {}

  // Initialize is an empty function by default. Override it with your own
  // initialization logic.
  initialize() {}

  // Manually bind a single named route to a callback. For example:
  //
  //     this.route('search/:query/p:num', 'search', function(query, num) {
  //       ...
  //     });
  //
  route(route, name, callback) {
    if (!isRegExp(route)) route = this._routeToRegExp(route);
    if (isFunction(name)) {
      callback = name;
      name = '';
    }
    if (!callback) callback = this[name];
    var router = this;
    History.instance.route(route, function(fragment) {
      var args = router._extractParameters(route, fragment);
      if (router.execute(callback, args, name) !== false) {
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        History.instance.trigger('route', router, name, args);
      }
    });
    return this;
  }

  // Execute a route handler with the provided parameters.  This is an
  // excellent place to do pre-route setup or post-route cleanup.
  execute(callback, args, name) {
    if (callback) callback.apply(this, args);
  }

  // Simple proxy to `Backbone.history` to save a fragment into the history.
  navigate(fragment, options) {
    History.instance.navigate(fragment, options);
    return this;
  }

  // Bind all defined routes to `Backbone.history`. We have to reverse the
  // order of the routes here to support behavior where the most general
  // routes can be defined at the bottom of the route map.
  _bindRoutes() {
    var routes = getClassProp(this, 'routes');
    if (!routes) return;
    this.routes = routes;
    var routeKey,
      routeKeys = keys(this.routes);
    while ((routeKey = routeKeys.pop()) != null) {
      this.route(routeKey, this.routes[routeKey]);
    }
  }

  // Convert a route string into a regular expression, suitable for matching
  // against the current location hash.
  _routeToRegExp(route) {
    route = route
      .replace(escapeRegExp, '\\$&')
      .replace(optionalParam, '(?:$1)?')
      .replace(namedParam, function(match, optional) {
        return optional ? match : '([^/?]+)';
      })
      .replace(splatParam, '([^?]*?)');
    return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$');
  }

  // Given a route, and a URL fragment that it matches, return the array of
  // extracted decoded parameters. Empty or unmatched parameters will be
  // treated as `null` to normalize cross-browser behavior.
  _extractParameters(route, fragment) {
    var params = route.exec(fragment).slice(1);
    return params.map(function(param, i) {
      // Don't decode the search params.
      if (i === params.length - 1) return param || null;
      return param ? decodeURIComponent(param) : null;
    });
  }
}

// Cached regular expressions for matching named param parts and splatted
// parts of route strings.
var optionalParam = /\((.*?)\)/g;
var namedParam = /(\(\?)?:\w+/g;
var splatParam = /\*\w+/g;
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;

// Backbone.History
// ----------------

// Handles cross-browser history management, based on either
// [pushState](http://diveintohtml5.info/history.html) and real URLs, or
// [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
// and URL fragments. If the browser supports neither (old IE, natch),
// falls back to polling.

class History extends Events {
  // Create the default Backbone.history.
  static get instance() {
    return this._instance || (this._instance = new History());
  }

  static set instance(value) {
    this._instance = value;
  }

  static start() {
    this.instance.start();
  }

  constructor() {
    super();
    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    this.interval = 50;
    this.handlers = [];
    this.checkUrl = this.checkUrl.bind(this);

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  }
  // Are we at the app root?
  atRoot() {
    var path = this.location.pathname.replace(/[^\/]$/, '$&/');
    return path === this.root && !this.getSearch();
  }

  // Does the pathname match the root?
  matchRoot() {
    var path = this.decodeFragment(this.location.pathname);
    var rootPath = path.slice(0, this.root.length - 1) + '/';
    return rootPath === this.root;
  }

  // Unicode characters in `location.pathname` are percent encoded so they're
  // decoded for comparison. `%25` should not be decoded since it may be part
  // of an encoded parameter.
  decodeFragment(fragment) {
    return decodeURI(fragment.replace(/%25/g, '%2525'));
  }

  // In IE6, the hash fragment and search params are incorrect if the
  // fragment contains `?`.
  getSearch() {
    var match = this.location.href.replace(/#.*/, '').match(/\?.+/);
    return match ? match[0] : '';
  }

  // Gets the true hash value. Cannot use location.hash directly due to bug
  // in Firefox where location.hash will always be decoded.
  getHash(window) {
    var match = (window || this).location.href.match(/#(.*)$/);
    return match ? match[1] : '';
  }

  // Get the pathname and search params, without the root.
  getPath() {
    var path = this.decodeFragment(this.location.pathname + this.getSearch()).slice(
      this.root.length - 1
    );
    return path.charAt(0) === '/' ? path.slice(1) : path;
  }

  // Get the cross-browser normalized URL fragment from the path or hash.
  getFragment(fragment) {
    if (fragment == null) {
      if (this._usePushState || !this._useHashChange) {
        fragment = this.getPath();
      } else {
        fragment = this.getHash();
      }
    }
    return fragment.replace(routeStripper, '');
  }

  // Start the hash change handling, returning `true` if the current URL matches
  // an existing route, and `false` otherwise.
  start(options) {
    if (History.started) throw new Error('Backbone.history has already been started');
    History.started = true;

    // Figure out the initial configuration.
    // Is pushState desired ... is it available?
    this.options = extend({ root: '/' }, this.options, options);
    this.root = this.options.root;
    this._useHashChange = this.options.hashChange !== false;
    this._usePushState = !!this.options.pushState;
    this.fragment = this.getFragment();

    // Normalize root to always include a leading and trailing slash.
    this.root = ('/' + this.root + '/').replace(rootStripper, '/');

    // Transition from hashChange to pushState or vice versa if both are
    // requested.
    if (this._useHashChange && this._usePushState) {
      // If we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      if (this.atRoot()) {
        this.navigate(this.getHash(), { replace: true });
      }
    }

    var addEventListener = window.addEventListener;

    // Depending on whether we're using pushState or hashes, and whether
    // 'onhashchange' is supported, determine how we check the URL state.
    if (this._usePushState) {
      addEventListener('popstate', this.checkUrl, false);
    } else if (this._useHashChange) {
      addEventListener('hashchange', this.checkUrl, false);
    }

    if (!this.options.silent) return this.loadUrl();
  }

  // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
  // but possibly useful for unit testing Routers.
  stop() {
    var removeEventListener = window.removeEventListener;

    // Remove window listeners.
    if (this._usePushState) {
      removeEventListener('popstate', this.checkUrl, false);
    } else if (this._useHashChange) {
      removeEventListener('hashchange', this.checkUrl, false);
    }

    History.started = false;
  }

  // Add a route to be tested when the fragment changes. Routes added later
  // may override previous routes.
  route(route, callback) {
    this.handlers.unshift({ route: route, callback: callback });
  }

  // Checks the current URL to see if it has changed, and if it has,
  // calls `loadUrl`.
  checkUrl(e) {
    var current = this.getFragment();

    if (current === this.fragment) return false;
    this.loadUrl();
  }

  // Attempt to load the current URL fragment. If a route succeeds with a
  // match, returns `true`. If no defined routes matches the fragment,
  // returns `false`.
  loadUrl(fragment) {
    // If the root doesn't match, no routes can match either.
    if (!this.matchRoot()) return false;
    fragment = this.fragment = this.getFragment(fragment);
    return this.handlers.some(function(handler) {
      if (handler.route.test(fragment)) {
        handler.callback(fragment);
        return true;
      }
    });
  }

  // Save a fragment into the hash history, or replace the URL state if the
  // 'replace' option is passed. You are responsible for properly URL-encoding
  // the fragment in advance.
  //
  // The options object can contain `trigger: true` if you wish to have the
  // route callback be fired (not usually desirable), or `replace: true`, if
  // you wish to modify the current URL without adding an entry to the history.
  navigate(fragment, options) {
    if (!History.started) return false;
    if (!options || options === true) options = { trigger: !!options };

    // Normalize the fragment.
    fragment = this.getFragment(fragment || '');

    // Don't include a trailing slash on the root.
    var rootPath = this.root;
    if (fragment === '' || fragment.charAt(0) === '?') {
      rootPath = rootPath.slice(0, -1) || '/';
    }
    var url = rootPath + fragment;

    // Strip the fragment of the query and hash for matching.
    fragment = fragment.replace(pathStripper, '');

    // Decode for matching.
    var decodedFragment = this.decodeFragment(fragment);

    if (this.fragment === decodedFragment) return;
    this.fragment = decodedFragment;

    // If pushState is available, we use it to set the fragment as a real URL.
    if (this._usePushState) {
      this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
    } else if (this._useHashChange) {
      this._updateHash(this.location, fragment, options.replace);

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
    } else {
      return this.location.assign(url);
    }
    if (options.trigger) return this.loadUrl(fragment);
  }

  // Update the hash location, either replacing the current entry, or adding
  // a new one to the browser history.
  _updateHash(location, fragment, replace) {
    if (replace) {
      var href = location.href.replace(/(javascript:|#).*$/, '');
      location.replace(href + '#' + fragment);
    } else {
      // Some browsers require that `hash` contains a leading #.
      location.hash = '#' + fragment;
    }
  }
}

// Cached regex for stripping a leading hash/slash and trailing space.
var routeStripper = /^[#\/]|\s+$/g;

// Cached regex for stripping leading and trailing slashes.
var rootStripper = /^\/+|\/+$/g;

// Cached regex for stripping urls of hash.
var pathStripper = /#.*$/;

// Helpers
// -------

// Throw an error when a URL is needed, and none is supplied.
var urlError = function() {
  throw new Error('A "url" property or function must be specified');
};

// Wrap an optional error callback with a fallback error event.
var wrapError = function(model, options) {
  var error = options.error;
  options.error = function(resp) {
    if (error) error.call(options.context, model, resp, options);
    model.trigger('error', model, resp, options);
  };
};

export {
  Model,
  Collection,
  Events,
  delegate,
  undelegate,
  view,
  event,
  state,
  withEvents,
  sync,
  ajax,
  Router,
  History
};

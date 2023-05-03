---
outline: deep
---

# Events

**Events** is a class that can be mixed in to any object, giving the object the ability to bind and trigger custom named events. Events do not have to be declared before they are bound, and may take passed arguments. For example:

```js
import { Events } from 'nextbone';

const object = {};

Events.extend(object);

object.on('alert', function(msg) {
  alert('Triggered ' + msg);
});

object.trigger('alert', 'an event');
```

For example, to make a handy event dispatcher that can coordinate events among different areas of your application: `const dispatcher = Events.extend({})`

Alternatively is possible to subclass Events:

```js
import { Events } from 'nextbone';

class ClassWithEvents extends Events {}

const object = new ClassWithEvents();

object.on('alert', function(msg) {
  alert('Triggered ' + msg);
});

object.trigger('alert', 'an event');
```

### on

`object.on(event, callback, [context])`  
Bind a **callback** function to an object. The callback will be invoked whenever the **event** is fired. If you have a large number of different events on a page, the convention is to use colons to namespace them: "poll:start", or "change:selection". The event string may also be a space-delimited list of several events...

```js
book.on("change:title change:author", ...);
```

Callbacks bound to the special "all" event will be triggered when any event occurs, and are passed the name of the event as the first argument. For example, to proxy all events from one object to another:

```js
proxy.on('all', function(eventName) {
  object.trigger(eventName);
});
```

All Nextbone event methods also support an event map syntax, as an alternative to positional arguments:

```js
book.on({
  'change:author': authorPane.update,
  'change:title change:subtitle': titleView.update,
  destroy: bookView.remove
});
```

To supply a **context** value for this when the callback is invoked, pass the optional last argument: model.on('change', this.render, this) or model.on({change: this.render}, this).

### off

`object.off([event], [callback], [context])`
Remove a previously-bound **callback** function from an object. If no **context** is specified, all of the versions of the callback with different contexts will be removed. If no callback is specified, all callbacks for the **event** will be removed. If no event is specified, callbacks for _all_ events will be removed.

```js
// Removes just the `onChange` callback.
object.off('change', onChange);

// Removes all "change" callbacks.
object.off('change');

// Removes the `onChange` callback for all events.
object.off(null, onChange);

// Removes all callbacks for `context` for all events.
object.off(null, null, context);

// Removes all callbacks on `object`.
object.off();
```

Note that calling model.off(), for example, will indeed remove _all_ events on the model — including events that Nextbone uses for internal bookkeeping.

### trigger

`object.trigger(event, [*args])`  
Trigger callbacks for the given **event**, or space-delimited list of events. Subsequent arguments to **trigger** will be passed along to the event callbacks.

### once

`object.once(event, callback, [context])`  
Just like [on](#Events-on), but causes the bound callback to fire only once before being removed. Handy for saying "the next time that X happens, do this". When multiple events are passed in using the space separated syntax, the event will fire once for every event you passed in, not once for a combination of all events

### listenTo

`object.listenTo(other, event, callback)`  
Tell an **object** to listen to a particular event on an **other** object. The advantage of using this form, instead of other.on(event, callback, object), is that **listenTo** allows the **object** to keep track of the events, and they can be removed all at once later on. The **callback** will always be called with **object** as context.

```js
view.listenTo(model, 'change', view.render);
```

### stopListening

`object.stopListening([other], [event], [callback])`  
Tell an **object** to stop listening to events. Either call **stopListening** with no arguments to have the **object** remove all of its [registered](#Events-listenTo) callbacks ... or be more precise by telling it to remove just the events it's listening to on a specific object, or a specific event, or just a specific callback.

```js
view.stopListening();

view.stopListening(model);
```

### listenToOnce

`object.listenToOnce(other, event, callback)`  
Just like [listenTo](#Events-listenTo), but causes the bound callback to fire only once before being removed.

### Catalog of Events

Here's the complete list of built-in Nextbone events, with arguments. You're also free to trigger your own events on Models, Collections and Views as you see fit.

- **"add"** (model, collection, options) — when a model is added to a collection.
- **"remove"** (model, collection, options) — when a model is removed from a collection.
- **"update"** (collection, options) — single event triggered after any number of models have been added, removed or changed in a collection.
- **"reset"** (collection, options) — when the collection's entire contents have been [reset](#Collection-reset).
- **"sort"** (collection, options) — when the collection has been re-sorted.
- **"change"** (model, options) — when a model's attributes have changed.
- **"changeId"** (model, previousId, options) — when the model's id has been updated.
- **"change:\[attribute\]"** (model, value, options) — when a specific attribute has been updated.
- **"destroy"** (model, collection, options) — when a model is [destroyed](#Model-destroy).
- **"request"** (model_or_collection, xhr, options) — when a model or collection has started a request to the server.
- **"sync"** (model_or_collection, response, options) — when a model or collection has been successfully synced with the server.
- **"error"** (model_or_collection, xhr, options) — when a model's or collection's request to the server has failed.
- **"invalid"** (model, error, options) — when a model's [validation](#Model-validate) fails on the client.
- **"route:\[name\]"** (params) — Fired by the router when a specific route is matched.
- **"route"** (route, params) — Fired by the router when _any_ route has been matched.
- **"route"** (router, route, params) — Fired by history when _any_ route has been matched.
- **"all"** — this special event fires for _any_ triggered event, passing the event name as the first argument followed by all trigger arguments.

Generally speaking, when calling a function that emits an event (model.set, collection.add, and so on...), if you'd like to prevent the event from being triggered, you may pass {silent: true} as an option. Note that this is _rarely_, perhaps even never, a good idea. Passing through a specific flag in the options for your event callback to look at, and choose to ignore, will usually work out better.

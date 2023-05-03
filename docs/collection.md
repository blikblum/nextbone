---
outline: deep
---

# Collection

Collections are ordered sets of models. You can bind "change" events to be notified when any model in the collection has been modified, listen for "add" and "remove" events, fetch the collection from the server, and use a full suite of lodash-es methods

Any event that is triggered on a model in a collection will also be triggered on the collection directly, for convenience. This allows you to listen for changes to specific attributes in any model in a collection, for example: documents.on("change:selected", ...)

### model

`collection.model([attrs], [options])` (static)
Override this property to specify the model class that the collection contains. If defined, you can pass raw attributes objects (and arrays) and options to [add](#Collection-add), [create](#Collection-create), and [reset](#Collection-reset), and the attributes will be converted into a model of the proper type using the provided options, if any.

```js
import { Collection } from 'nextbone';

class Library extends Collection {
  static model = Book;
}
```

A collection can also contain polymorphic models by overriding this property with a constructor that returns a model.

```js
class Library extends Collection {
  model: function(attrs, options) {
    if (condition) {
      return new PublicDocument(attrs, options);
    } else {
      return new PrivateDocument(attrs, options);
    }
  }
};
```

### modelId

`collection.modelId(attrs, idAttribute)`  
Override this method to return the value the collection will use to identify a model given its attributes. Useful for combining models from multiple tables with different [idAttribute](#Model-idAttribute) values into a single collection.

By default returns the value of the given [idAttribute](#Model-idAttribute) within the attrs, or failing that, id. If your collection uses a [model factory](#Collection-model) and the id ranges of those models might collide, you must override this method.

```js
class Library extends Collection {
  modelId: function(attrs) {
    return attrs.type + attrs.id;
  }
};

var library = new Library([{ type: 'dvd', id: 1 }, { type: 'vhs', id: 1 }]);

var dvdId = library.get('dvd1').id;
var vhsId = library.get('vhs1').id;
alert('dvd: ' + dvdId + ', vhs: ' + vhsId);
```

### preinitialize

`new Backbone.Collection([models], [options])`  
If you define a **preinitialize** method, it will be invoked when the Collection is first created and before any instantiation logic is run for the Collection.

```js
class Library extends Collection {
  preinitialize() {
    this.on('add', function() {
      console.log('Add model event got fired!');
    });
  }
}
```

### constructor / initialize

`new Collection([models], [options])`  
When creating a Collection, you may choose to pass in the initial array of **models**. The collection's [comparator](#Collection-comparator) may be included as an option. Passing false as the comparator option will prevent sorting. If you define an **initialize** function, it will be invoked when the collection is created. There are a couple of options that, if provided, are attached to the collection directly: model and comparator.  
Pass null for models to create an empty Collection with options.

```js
var tabs = new TabSet([tab1, tab2, tab3]);
var spaces = new Collection(null, {
  model: Space
});
```

### models

`collection.models`  
Raw access to the JavaScript array of models inside of the collection. Usually you'll want to use get, at, or the **Underscore methods** to access model objects, but occasionally a direct reference to the array is desired.

### toJSON

`collection.toJSON([options])`  
Return an array containing the attributes hash of each model (via [toJSON](#Model-toJSON)) in the collection. This can be used to serialize and persist the collection as a whole. The name of this method is a bit confusing, because it conforms to [JavaScript's JSON API](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON_behavior).

```js
var collection = new Backbone.Collection([
  { name: 'Tim', age: 5 },
  { name: 'Ida', age: 26 },
  { name: 'Rob', age: 55 }
]);

alert(JSON.stringify(collection));
```

### sync

`collection.sync(method, collection, [options])`  
Uses [Backbone.sync](#Sync) to persist the state of a collection to the server. Can be overridden for custom behavior.

### Underscore Methods (46)

Backbone proxies to **Underscore.js** to provide 46 iteration functions on **Backbone.Collection**. They aren't all documented here, but you can take a look at the Underscore documentation for the full details…

Most methods can take an object or string to support model-attribute-style predicates or a function that receives the model instance as an argument.

- [forEach (each)](http://underscorejs.org/#each)
- [map (collect)](http://underscorejs.org/#map)
- [reduce (foldl, inject)](http://underscorejs.org/#reduce)
- [reduceRight (foldr)](http://underscorejs.org/#reduceRight)
- [find (detect)](http://underscorejs.org/#find)
- [findIndex](http://underscorejs.org/#findIndex)
- [findLastIndex](http://underscorejs.org/#findLastIndex)
- [filter (select)](http://underscorejs.org/#filter)
- [reject](http://underscorejs.org/#reject)
- [every (all)](http://underscorejs.org/#every)
- [some (any)](http://underscorejs.org/#some)
- [contains (includes)](http://underscorejs.org/#contains)
- [invoke](http://underscorejs.org/#invoke)
- [max](http://underscorejs.org/#max)
- [min](http://underscorejs.org/#min)
- [sortBy](http://underscorejs.org/#sortBy)
- [groupBy](http://underscorejs.org/#groupBy)
- [shuffle](http://underscorejs.org/#shuffle)
- [toArray](http://underscorejs.org/#toArray)
- [size](http://underscorejs.org/#size)
- [first (head, take)](http://underscorejs.org/#first)
- [initial](http://underscorejs.org/#initial)
- [rest (tail, drop)](http://underscorejs.org/#rest)
- [last](http://underscorejs.org/#last)
- [without](http://underscorejs.org/#without)
- [indexOf](http://underscorejs.org/#indexOf)
- [lastIndexOf](http://underscorejs.org/#lastIndexOf)
- [isEmpty](http://underscorejs.org/#isEmpty)
- [difference](http://underscorejs.org/#difference)
- [sample](http://underscorejs.org/#sample)
- [partition](http://underscorejs.org/#partition)
- [countBy](http://underscorejs.org/#countBy)
- [indexBy](http://underscorejs.org/#indexBy)

```js
books.each(function(book) {
  book.publish();
});

var titles = books.map('title');

var publishedBooks = books.filter({ published: true });

var alphabetical = books.sortBy(function(book) {
  return book.author.get('name').toLowerCase();
});

var randomThree = books.sample(3);
```

### add

`collection.add(models, [options])`  
Add a model (or an array of models) to the collection, firing an "add" event for each model, and an "update" event afterwards. If a [model](#Collection-model) property is defined, you may also pass raw attributes objects and options, and have them be vivified as instances of the model using the provided options. Returns the added (or preexisting, if duplicate) models. Pass {at: index} to splice the model into the collection at the specified index. If you're adding models to the collection that are _already_ in the collection, they'll be ignored, unless you pass {merge: true}, in which case their attributes will be merged into the corresponding models, firing any appropriate "change" events.

```js
var ships = new Backbone.Collection();

ships.on('add', function(ship) {
  alert('Ahoy ' + ship.get('name') + '!');
});

ships.add([{ name: 'Flying Dutchman' }, { name: 'Black Pearl' }]);
```

Note that adding the same model (a model with the same id) to a collection more than once  
is a no-op.

### remove

`collection.remove(models, [options])`  
Remove a model (or an array of models) from the collection, and return them. Each model can be a Model instance, an id string or a JS object, any value acceptable as the id argument of [collection.get](#Collection-get). Fires a "remove" event for each model, and a single "update" event afterwards, unless {silent: true} is passed. The model's index before removal is available to listeners as options.index.

### reset

`collection.reset([models], [options])`  
Adding and removing models one at a time is all well and good, but sometimes you have so many models to change that you'd rather just update the collection in bulk. Use **reset** to replace a collection with a new list of models (or attribute hashes), triggering a single "reset" event on completion, and _without_ triggering any add or remove events on any models. Returns the newly-set models. For convenience, within a "reset" event, the list of any previous models is available as options.previousModels.  
Pass null for models to empty your Collection with options.

Here's an example using **reset** to bootstrap a collection during initial page load, in a Rails application:

```js
<script>
  var accounts = new Backbone.Collection;
  accounts.reset(<%= @accounts.to_json %>);
</script>
```

Calling collection.reset() without passing any models as arguments will empty the entire collection.

### set

`collection.set(models, [options])`  
The **set** method performs a "smart" update of the collection with the passed list of models. If a model in the list isn't yet in the collection it will be added; if the model is already in the collection its attributes will be merged; and if the collection contains any models that _aren't_ present in the list, they'll be removed. All of the appropriate "add", "remove", and "change" events are fired as this happens. Returns the touched models in the collection. If you'd like to customize the behavior, you can disable it with options: {add: false}, {remove: false}, or {merge: false}.

```js
var vanHalen = new Backbone.Collection([eddie, alex, stone, roth]);

vanHalen.set([eddie, alex, stone, hagar]);

// Fires a "remove" event for roth, and an "add" event for "hagar".
// Updates any of stone, alex, and eddie's attributes that may have
// changed over the years.
```

### get

`collection.get(id)`  
Get a model from a collection, specified by an [id](#Model-id), a [cid](#Model-cid), or by passing in a **model**.

```js
var book = library.get(110);
```

### at

`collection.at(index)`  
Get a model from a collection, specified by index. Useful if your collection is sorted, and if your collection isn't sorted, **at** will still retrieve models in insertion order. When passed a negative index, it will retrieve the model from the back of the collection.

### push

`collection.push(model, [options])`  
Add a model at the end of a collection. Takes the same options as [add](#Collection-add).

### pop

`collection.pop([options])`  
Remove and return the last model from a collection. Takes the same options as [remove](#Collection-remove).

### unshift

`collection.unshift(model, [options])`  
Add a model at the beginning of a collection. Takes the same options as [add](#Collection-add).

### shift

`collection.shift([options])`  
Remove and return the first model from a collection. Takes the same options as [remove](#Collection-remove).

### slice

`collection.slice(begin, end)`  
Return a shallow copy of this collection's models, using the same options as native [Array#slice](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/slice).

### length

`collection.length`  
Like an array, a Collection maintains a length property, counting the number of models it contains.

### comparator

`collection.comparator`  
By default there is no **comparator** for a collection. If you define a comparator, it will be used to sort the collection any time a model is added. A comparator can be defined as a [sortBy](http://underscorejs.org/#sortBy) (pass a function that takes a single argument), as a [sort](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array/sort) (pass a comparator function that expects two arguments), or as a string indicating the attribute to sort by.

"sortBy" comparator functions take a model and return a numeric or string value by which the model should be ordered relative to others. "sort" comparator functions take two models, and return \-1 if the first model should come before the second, 0 if they are of the same rank and 1 if the first model should come after. _Note that Backbone depends on the arity of your comparator function to determine between the two styles, so be careful if your comparator function is bound._

Note how even though all of the chapters in this example are added backwards, they come out in the proper order:

```js
var Chapter = Backbone.Model;
var chapters = new Backbone.Collection();

chapters.comparator = 'page';

chapters.add(new Chapter({ page: 9, title: 'The End' }));
chapters.add(new Chapter({ page: 5, title: 'The Middle' }));
chapters.add(new Chapter({ page: 1, title: 'The Beginning' }));

alert(chapters.pluck('title'));
```

Collections with a comparator will not automatically re-sort if you later change model attributes, so you may wish to call sort after changing model attributes that would affect the order.

### sort

`collection.sort([options])`  
Force a collection to re-sort itself. Note that a collection with a [comparator](#Collection-comparator) will sort itself automatically whenever a model is added. To disable sorting when adding a model, pass {sort: false} to add. Calling **sort** triggers a "sort" event on the collection.

### pluck

`collection.pluck(attribute)`  
Pluck an attribute from each model in the collection. Equivalent to calling map and returning a single attribute from the iterator.

```js
var stooges = new Backbone.Collection([{ name: 'Curly' }, { name: 'Larry' }, { name: 'Moe' }]);

var names = stooges.pluck('name');

alert(JSON.stringify(names));
```

### where

`collection.where(attributes)`  
Return an array of all the models in a collection that match the passed **attributes**. Useful for simple cases of filter.

```js
var friends = new Backbone.Collection([
  { name: 'Athos', job: 'Musketeer' },
  { name: 'Porthos', job: 'Musketeer' },
  { name: 'Aramis', job: 'Musketeer' },
  { name: "d'Artagnan", job: 'Guard' }
]);

var musketeers = friends.where({ job: 'Musketeer' });

alert(musketeers.length);
```

### findWhere

`collection.findWhere(attributes)`  
Just like [where](#Collection-where), but directly returns only the first model in the collection that matches the passed **attributes**. If no model matches returns undefined.

### url

`collection.url or collection.url()`  
Set the **url** property (or function) on a collection to reference its location on the server. Models within the collection will use **url** to construct URLs of their own.

```js
var Notes = Backbone.Collection.extend({
  url: '/notes'
});

// Or, something more sophisticated:

var Notes = Backbone.Collection.extend({
  url: function() {
    return this.document.url() + '/notes';
  }
});
```

### parse

`collection.parse(response, options)`  
**parse** is called by Backbone whenever a collection's models are returned by the server, in [fetch](#Collection-fetch). The function is passed the raw response object, and should return the array of model attributes to be [added](#Collection-add) to the collection. The default implementation is a no-op, simply passing through the JSON response. Override this if you need to work with a preexisting API, or better namespace your responses.

```js
var Tweets = Backbone.Collection.extend({
  // The Twitter Search API returns tweets under "results".
  parse: function(response) {
    return response.results;
  }
});
```

### clone

`collection.clone()`  
Returns a new instance of the collection with an identical list of models.

### fetch

`collection.fetch([options])`  
Fetch the default set of models for this collection from the server, [setting](#Collection-set) them on the collection when they arrive. The **options** hash takes success and error callbacks which will both be passed (collection, response, options) as arguments. When the model data returns from the server, it uses [set](#Collection-set) to (intelligently) merge the fetched models, unless you pass {reset: true}, in which case the collection will be (efficiently) [reset](#Collection-reset). Delegates to [Backbone.sync](#Sync) under the covers for custom persistence strategies and returns a [jqXHR](http://api.jquery.com/jQuery.ajax/#jqXHR). The server handler for **fetch** requests should return a JSON array of models.

```js
Backbone.sync = function(method, model) {
  alert(method + ': ' + model.url);
};

var accounts = new Backbone.Collection();
accounts.url = '/accounts';

accounts.fetch();
```

The behavior of **fetch** can be customized by using the available [set](#Collection-set) options. For example, to fetch a collection, getting an "add" event for every new model, and a "change" event for every changed existing model, without removing anything: collection.fetch({remove: false})

**jQuery.ajax** options can also be passed directly as **fetch** options, so to fetch a specific page of a paginated collection: Documents.fetch({data: {page: 3}})

Note that **fetch** should not be used to populate collections on page load — all models needed at load time should already be [bootstrapped](#FAQ-bootstrap) in to place. **fetch** is intended for lazily-loading models for interfaces that are not needed immediately: for example, documents with collections of notes that may be toggled open and closed.

### create

`collection.create(attributes, [options])`  
Convenience to create a new instance of a model within a collection. Equivalent to instantiating a model with a hash of attributes, saving the model to the server, and adding the model to the set after being successfully created. Returns the new model. If client-side validation failed, the model will be unsaved, with validation errors. In order for this to work, you should set the [model](#Collection-model) property of the collection. The **create** method can accept either an attributes hash and options to be passed down during model instantiation or an existing, unsaved model object.

Creating a model will cause an immediate "add" event to be triggered on the collection, a "request" event as the new model is sent to the server, as well as a "sync" event, once the server has responded with the successful creation of the model. Pass {wait: true} if you'd like to wait for the server before adding the new model to the collection.

```js
var Library = Backbone.Collection.extend({
  model: Book
});

var nypl = new Library();

var othello = nypl.create({
  title: 'Othello',
  author: 'William Shakespeare'
});
```

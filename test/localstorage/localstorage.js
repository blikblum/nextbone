import { Model, Collection, ajax } from '../../nextbone';
import { localStorage } from '../../localstorage';
import { clone, uniq } from 'underscore';

import { expect } from 'chai';
import { stub } from 'sinon';

const root = window;

const attributes = {
  string: 'String',
  string2: 'String 2',
  number: 1337
};

@localStorage('SavedModel')
class SavedModel extends Model {
  urlRoot = '/test/';
  defaults() {
    return attributes
  }
};

class AjaxModel extends Model {
  defaults() {
    return attributes
  }
};

@localStorage('SavedCollection')
class SavedCollection extends Collection {
  static model = AjaxModel;
};

@localStorage('DifferentId')
class DifferentIdAttribute extends Model {
  static idAttribute = 'number'
};

describe('LocalStorage Model', function() {
  let mySavedModel;

  beforeEach(function() {
    mySavedModel = new SavedModel({
      id: 10
    });
  });

  afterEach(function() {
    mySavedModel = null;
    root.localStorage.clear();
  });

  it('is saved with the given name', function() {
    mySavedModel.save();
    const item = root.localStorage.getItem('SavedModel-10');
    const parsed = JSON.parse(item);

    expect(parsed.id).to.be.equal(10);
    expect(parsed.string).to.be.a('string');
    expect(parsed.string2).to.be.equal('String 2');
    expect(parsed.number).to.be.equal(1337);
  });

  it('can be converted to JSON', function() {
    expect(mySavedModel.toJSON()).to.eql({
      string: 'String',
      id: 10,
      number: 1337,
      string2: 'String 2'
    });
  });

  describe('if not saved', function() {
    it('will pass error callbacks from fetch', function(done) {
      mySavedModel.fetch({
        error(model, resp) {
          expect(model).to.equal(mySavedModel);
          expect(resp).to.equal('Record Not Found');
          done();
        }
      });
    });
  });

  describe('once saved', function() {
    beforeEach(function() {
      mySavedModel.save();
    });

    afterEach(function() {
      root.localStorage.clear();
    });

    it('can fetch from localStorage', function() {
      const newModel = new SavedModel({
        id: 10
      });

      newModel.fetch();

      expect(newModel.get('string')).to.be.a('string');
      expect(newModel.get('string2')).to.be.equal('String 2');
      expect(newModel.get('number')).to.be.equal(1337);
    });

    it('passes fetch calls to success', function(done) {
      mySavedModel.fetch({
        success(model, response, options) {
          expect(model).to.equal(mySavedModel);
          done();
        }
      });
    });

    it('can be updated', function() {
      mySavedModel.save({
        string: 'New String',
        number2: 1234
      });

      expect(mySavedModel.pick('string', 'number2')).to.eql({
        string: 'New String', 'number2': 1234
      });
    });

    it('persists its update to localStorage', function() {
      mySavedModel.save({
        string: 'New String',
        number2: 1234
      });

      const item = root.localStorage.getItem(`SavedModel-${mySavedModel.id}`);

      expect(item).to.not.be.null;

      const parsed = JSON.parse(item);

      expect(parsed).to.eql({
        string: 'New String',
        string2: 'String 2',
        id: 10,
        number: 1337,
        number2: 1234
      });
    });

    it('saves to localStorage with patch', function() {
      mySavedModel.save({
        string: 'New String',
        number2: 1234
      }, { patch: true });

      const item = root.localStorage.getItem(`SavedModel-${mySavedModel.id}`);

      expect(item).to.not.be.null;

      const parsed = JSON.parse(item);

      expect(parsed).to.eql({
        string: 'New String',
        string2: 'String 2',
        id: 10,
        number: 1337,
        number2: 1234
      });
    });

    it('can be destroyed', function() {
      mySavedModel.destroy();

      const item = root.localStorage.getItem('SavedModel-10');
      expect(item).to.be.null;
    });
  });

  describe('with storage updated from elsewhere', function() {
    let newModel;
    beforeEach(function() {
      newModel = new SavedModel({
        id: 10
      });
      newModel.fetch();
      mySavedModel.save({
        string: 'Brand new string'
      });
    });

    afterEach(function() {
      root.localStorage.clear();
      newModel = null;
    });

    it('will re-fetch new data', function() {
      newModel.fetch();

      expect(newModel.get('string')).to.eql('Brand new string');
    });
  });

  describe('using ajaxSync: true', function() {
    beforeEach(function() {
      stub(ajax, 'handler');
    });

    afterEach(function() {
      ajax.handler.restore();
    });

    it('calls ajax.handler for fetch', function() {
      mySavedModel.fetch({ ajaxSync: true });

      expect(ajax.handler.called).to.be.true;
      expect(ajax.handler.getCall(0).args[0].url).to.be.equal('/test/10');
      expect(ajax.handler.getCall(0).args[0].type).to.be.equal('GET');
    });

    it('calls ajax.handler for save', function() {
      mySavedModel.save({}, { ajaxSync: true });

      expect(ajax.handler.called).to.be.true;
      expect(ajax.handler.getCall(0).args[0].type).to.be.equal('PUT');
      expect(ajax.handler.getCall(0).args[0].url).to.be.equal('/test/10');

      const data = JSON.parse(ajax.handler.getCall(0).args[0].data);

      expect(data).to.eql({
        string: 'String',
        string2: 'String 2',
        number: 1337,
        id: 10
      });
    });
  });
});


describe('Model with different idAttribute', function() {
  let mySavedModel;

  beforeEach(function() {
    mySavedModel = new DifferentIdAttribute(attributes);
  });

  afterEach(function() {
    mySavedModel = null;
    root.localStorage.clear();
  });

  it('saves using the new value', function() {
    mySavedModel.save();
    const item = root.localStorage.getItem('DifferentId-1337');
    const parsed = JSON.parse(item);

    expect(item).to.not.be.null;
    expect(parsed.string).to.be.a('string');
  });

  it('fetches using the new value', function() {
    root.localStorage.setItem('DifferentId-1337', JSON.stringify(attributes));
    const newModel = new DifferentIdAttribute({ number: 1337 });

    newModel.fetch();

    expect(newModel.id).to.be.equal(1337);
    expect(newModel.get('string')).to.be.a('string');
  });
});


describe('New localStorage model', function() {
  let mySavedModel;

  beforeEach(function() {
    mySavedModel = new SavedModel();
  });

  afterEach(function() {
    root.localStorage.clear();
    mySavedModel = null;
  });

  it('creates a new item in localStorage', function() {
    mySavedModel.save({
      data: 'value'
    });

    const itemId = mySavedModel.id;
    const item = root.localStorage.getItem(`SavedModel-${itemId}`);

    const parsed = JSON.parse(item);

    expect(parsed).to.eql(mySavedModel.attributes);
  });
});


describe('LocalStorage Collection', function() {
  let mySavedCollection;

  beforeEach(function() {
    mySavedCollection = new SavedCollection();
  });

  afterEach(function() {
    mySavedCollection = null;
    root.localStorage.clear();
  });

  it('saves to localStorage', function() {
    mySavedCollection.create(attributes);
    expect(mySavedCollection.length).to.be.equal(1);
  });

  it('cannot duplicate id in localStorage', function() {
    const item = clone(attributes);
    item.id = 5;

    const newCollection = new SavedCollection([item]);
    newCollection.create(item);
    newCollection.create(item);
    const localItem = root.localStorage.getItem('SavedCollection-5');

    expect(newCollection.length).to.be.equal(1);
    expect(JSON.parse(localItem).id).to.be.equal(5);

    const records = newCollection.localStorage.records;
    expect(uniq(records)).to.eql(records);
  });


  describe('pulling from localStorage', function() {
    let model;
    let item;

    beforeEach(function() {
      model = mySavedCollection.create(attributes);
      const id = model.id;
      item = root.localStorage.getItem(`SavedCollection-${id}`);
    });

    afterEach(function() {
      model = item = null;
    });

    it('saves into the localStorage', function() {
      expect(item).to.not.be.null;
    });

    it('saves the right data', function() {
      const parsed = JSON.parse(item);
      expect(parsed.id).to.equal(model.id);
      expect(parsed.string).to.be.a('string');
    });

    it('reads from localStorage', function() {
      const newCollection = new SavedCollection();
      newCollection.fetch();

      expect(newCollection.length).to.be.equal(1);
      const newModel = newCollection.at(0);
      expect(newModel.get('string')).to.be.a('string');
    });

    it('destroys models and removes from collection', function() {
      const parsed = JSON.parse(item);
      const newModel = mySavedCollection.get(parsed.id);
      newModel.destroy();

      const removed = root.localStorage.getItem(`SavedCollection-${parsed.id}`);

      expect(removed).to.be.null;
      expect(mySavedCollection.length).to.be.equal(0);
    });
  });

  describe('in another instance', function() {
    let newCollection = null;

    beforeEach(function() {
      mySavedCollection.create(attributes);
      newCollection = new SavedCollection();
      newCollection.fetch();
    });

    afterEach(function() {
      newCollection = null;
    });

    it('fetches the items from the original collection', function() {
      expect(newCollection.length).to.equal(1);
    });

    it('reads data saved in first instance', function() {
      const newAttributes = clone(attributes);
      newAttributes.number = 1338;
      mySavedCollection.create(newAttributes);
      newCollection.fetch();
      expect(newCollection.length).to.equal(2);
    });

    it('reads data saved in both instances', function() {
      let newAttributes = clone(attributes);
      newAttributes.number = 1338;
      mySavedCollection.create(newAttributes);
      newAttributes = clone(attributes);
      newAttributes.number = 1339;
      newCollection.create(newAttributes);
      
      mySavedCollection.fetch();
      newCollection.fetch();

      expect(mySavedCollection.length).to.equal(3);
      expect(newCollection.length).to.equal(3);
      expect(mySavedCollection.find({number: 1338})).to.be.a('object');
      expect(mySavedCollection.find({number: 1339})).to.be.a('object');
      expect(newCollection.find({number: 1338})).to.be.a('object');
      expect(newCollection.find({number: 1339})).to.be.a('object');      
    });
  });
});

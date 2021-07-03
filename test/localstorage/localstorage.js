import { Model, Collection, ajax } from '../../nextbone';
import { localStorage, bindLocalStorage } from '../../localstorage';
import { clone, uniq } from 'lodash-es';

import 'chai/chai.js';
import { stub } from 'sinon';

const root = window;
const expect = window.chai.expect;

const attributes = {
  string: 'String',
  string2: 'String 2',
  number: 1337
};

@localStorage('SavedModel')
class SavedModel extends Model {
  urlRoot = '/test/';
  defaults() {
    return attributes;
  }
}

class AjaxModel extends Model {
  defaults() {
    return attributes;
  }
}

@localStorage('SavedCollection')
class SavedCollection extends Collection {
  static model = AjaxModel;
}

@localStorage('DifferentId')
class DifferentIdAttribute extends Model {
  static idAttribute = 'number';
}

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

  it('is saved with the given name', async function() {
    await mySavedModel.save();
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

  it('can be configured at runtime', async function() {
    const anyModel = new Model({
      name: 'Jim'
    });

    bindLocalStorage(anyModel, 'ModelAtRuntime');

    await anyModel.save();

    const itemId = anyModel.id;
    const item = root.localStorage.getItem(`ModelAtRuntime-${itemId}`);

    const parsed = JSON.parse(item);

    expect(parsed).to.eql(anyModel.attributes);
  });

  describe('if not saved', function() {
    it('will pass error callbacks from fetch', function(done) {
      mySavedModel
        .fetch({
          error(model, error) {
            expect(model).to.equal(mySavedModel);
            expect(error).to.be.instanceOf(Error);
            expect(error.message).to.equal('Record Not Found');
            done();
          }
        })
        .catch(error => {});
    });
  });

  describe('once saved', function() {
    beforeEach(async function() {
      await mySavedModel.save();
    });

    afterEach(function() {
      root.localStorage.clear();
    });

    it('can fetch from localStorage', async function() {
      const newModel = new SavedModel({
        id: 10
      });

      await newModel.fetch();

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

    it('can be updated', async function() {
      await mySavedModel.save({
        string: 'New String',
        number2: 1234
      });

      expect(mySavedModel.pick('string', 'number2')).to.eql({
        string: 'New String',
        number2: 1234
      });
    });

    it('persists its update to localStorage', async function() {
      await mySavedModel.save({
        string: 'New String',
        number2: 1234
      });

      const item = root.localStorage.getItem(`SavedModel-${mySavedModel.id}`);

      expect(item).to.not.be['null'];

      const parsed = JSON.parse(item);

      expect(parsed).to.eql({
        string: 'New String',
        string2: 'String 2',
        id: 10,
        number: 1337,
        number2: 1234
      });
    });

    it('saves to localStorage with patch', async function() {
      await mySavedModel.save(
        {
          string: 'New String',
          number2: 1234
        },
        { patch: true }
      );

      const item = root.localStorage.getItem(`SavedModel-${mySavedModel.id}`);

      expect(item).to.not.be['null'];

      const parsed = JSON.parse(item);

      expect(parsed).to.eql({
        string: 'New String',
        string2: 'String 2',
        id: 10,
        number: 1337,
        number2: 1234
      });
    });

    it('can be destroyed', async function() {
      await mySavedModel.destroy();

      const item = root.localStorage.getItem('SavedModel-10');
      const localRecords = root.localStorage.getItem('SavedModel');

      expect(item).to.be['null'];
      expect(localRecords).to.be.equal('');
    });
  });

  describe('with storage updated from elsewhere', function() {
    let newModel;
    beforeEach(async function() {
      newModel = new SavedModel({
        id: 10
      });
      await mySavedModel.save({
        string: 'The string'
      });
    });

    afterEach(function() {
      root.localStorage.clear();
      newModel = null;
    });

    it('will fetch saved data', async function() {
      await newModel.fetch();

      expect(newModel.get('string')).to.eql('The string');
    });

    it('will re-fetch new data', async function() {
      await mySavedModel.save({
        string: 'Brand new string'
      });

      await newModel.fetch();

      expect(newModel.get('string')).to.eql('Brand new string');
    });
  });

  describe('using ajaxSync: true', function() {
    beforeEach(function() {
      stub(ajax, 'handler').resolves({});
    });

    afterEach(function() {
      ajax.handler.restore();
    });

    it('calls ajax.handler for fetch', async function() {
      await mySavedModel.fetch({ ajaxSync: true });

      expect(ajax.handler.called).to.be['true'];
      expect(ajax.handler.getCall(0).args[0].url).to.be.equal('/test/10');
      expect(ajax.handler.getCall(0).args[0].type).to.be.equal('GET');
    });

    it('calls ajax.handler for save', async function() {
      await mySavedModel.save({}, { ajaxSync: true });

      expect(ajax.handler.called).to.be['true'];
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

  it('saves using the new value', async function() {
    await mySavedModel.save();
    const item = root.localStorage.getItem('DifferentId-1337');
    const parsed = JSON.parse(item);

    expect(item).to.not.be['null'];
    expect(parsed.string).to.be.a('string');
  });

  it('fetches using the new value', async function() {
    root.localStorage.setItem('DifferentId-1337', JSON.stringify(attributes));
    const newModel = new DifferentIdAttribute({ number: 1337 });

    await newModel.fetch();

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

  it('creates a new item in localStorage', async function() {
    await mySavedModel.save({
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

  it('saves to localStorage', async function() {
    await mySavedCollection.create(attributes);
    expect(mySavedCollection.length).to.be.equal(1);
  });

  it('cannot duplicate id in localStorage', async function() {
    const item = clone(attributes);
    item.id = 5;

    const newCollection = new SavedCollection([item]);
    await newCollection.create(item);
    await newCollection.create(item);
    const localItem = root.localStorage.getItem('SavedCollection-5');

    expect(newCollection.length).to.be.equal(1);
    expect(JSON.parse(localItem).id).to.be.equal(5);

    const records = newCollection.localStorage.records;
    expect(uniq(records)).to.eql(records);
  });

  it('can be configured at runtime', function() {
    const anyCollection = new Collection([
      {
        name: 'Jones'
      }
    ]);

    bindLocalStorage(anyCollection, 'CollectionAtRuntime');

    const anyModel = anyCollection.at(0);
    anyModel.save();

    const itemId = anyModel.id;
    const item = root.localStorage.getItem(`CollectionAtRuntime-${itemId}`);

    const parsed = JSON.parse(item);

    expect(parsed).to.eql(anyModel.attributes);
  });

  describe('pulling from localStorage', function() {
    let model;
    let item;

    beforeEach(async function() {
      model = await mySavedCollection.create(attributes);
      const id = model.id;
      item = root.localStorage.getItem(`SavedCollection-${id}`);
    });

    afterEach(function() {
      model = item = null;
    });

    it('saves into the localStorage', function() {
      expect(item).to.not.be['null'];
    });

    it('saves the right data', function() {
      const parsed = JSON.parse(item);
      expect(parsed.id).to.equal(model.id);
      expect(parsed.string).to.be.a('string');
    });

    it('reads from localStorage', async function() {
      const newCollection = new SavedCollection();
      await newCollection.fetch();

      expect(newCollection.length).to.be.equal(1);
      const newModel = newCollection.at(0);
      expect(newModel.get('string')).to.be.a('string');
    });

    it('destroys models and removes from collection', async function() {
      const parsed = JSON.parse(item);
      const newModel = mySavedCollection.get(parsed.id);
      await newModel.destroy();

      const removed = root.localStorage.getItem(`SavedCollection-${parsed.id}`);
      const localRecords = root.localStorage.getItem('SavedCollection');

      expect(removed).to.be['null'];
      expect(mySavedCollection.length).to.be.equal(0);
      expect(localRecords).to.be.equal('');
    });
  });

  describe('in another instance', function() {
    let newCollection = null;

    beforeEach(async function() {
      await mySavedCollection.create(attributes);
      newCollection = new SavedCollection();
      newCollection.fetch();
    });

    afterEach(function() {
      newCollection = null;
    });

    it('fetches the items from the original collection', function() {
      expect(newCollection.length).to.equal(1);
    });

    it('reads data saved in first instance', async function() {
      const newAttributes = clone(attributes);
      newAttributes.number = 1338;
      await mySavedCollection.create(newAttributes);
      await newCollection.fetch();
      expect(newCollection.length).to.equal(2);
    });

    it('reads data saved in both instances', async function() {
      let newAttributes = clone(attributes);
      newAttributes.number = 1338;
      await mySavedCollection.create(newAttributes);
      newAttributes = clone(attributes);
      newAttributes.number = 1339;
      await newCollection.create(newAttributes);

      await mySavedCollection.fetch();
      await newCollection.fetch();

      expect(mySavedCollection.length).to.equal(3);
      expect(newCollection.length).to.equal(3);
      expect(mySavedCollection.find({ number: 1338 })).to.be.a('object');
      expect(mySavedCollection.find({ number: 1339 })).to.be.a('object');
      expect(newCollection.find({ number: 1338 })).to.be.a('object');
      expect(newCollection.find({ number: 1339 })).to.be.a('object');
    });
  });
});

describe('Initial data', () => {
  it('can be defined as an array', async () => {
    const arrayData = [
      {
        id: 1,
        name: 'John'
      },
      {
        name: 'Jim'
      },
      {
        id: 2,
        name: 'Jones'
      }
    ];
    @localStorage('SavedCollectionWithData', { initialData: arrayData })
    class SavedCollectionWithData extends Collection {}

    const collectionWithData = new SavedCollectionWithData();
    await collectionWithData.fetch();

    const localRecords = root.localStorage.getItem('SavedCollectionWithData');

    expect(collectionWithData.length).to.equal(3);
    expect(localRecords).to.match(/1,\S{8}-\S{4}-\S{4}-\S{4}-\S{12},2/);
  });

  it('can be defined as a object', async () => {
    const objectData = {
      id: 1,
      name: 'John'
    };
    @localStorage('SavedModelWithData', { initialData: objectData })
    class SavedModelWithData extends Model {}

    const modelWithData = new SavedModelWithData({ id: 1 });
    await modelWithData.fetch();

    const localRecords = root.localStorage.getItem('SavedModelWithData');

    expect(modelWithData.get('id')).to.equal(1);
    expect(modelWithData.get('name')).to.equal('John');
    expect(localRecords).to.equal('1');
  });

  it('can be defined as a function', async () => {
    function getData() {
      return [
        {
          id: 2,
          name: 'Jim'
        }
      ];
    }
    @localStorage('NewSavedModelWithData', { initialData: getData })
    class SavedModelWithData extends Model {}

    const modelWithData = new SavedModelWithData({ id: 2 });
    await modelWithData.fetch();

    const localRecords = root.localStorage.getItem('NewSavedModelWithData');

    expect(modelWithData.get('id')).to.equal(2);
    expect(modelWithData.get('name')).to.equal('Jim');
    expect(localRecords).to.equal('2');
  });
});

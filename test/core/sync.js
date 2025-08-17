import * as Backbone from 'nextbone';
import * as _ from 'lodash-es';

import { expect } from 'chai';

describe('Backbone.sync', function () {
  let Library, library, attrs, ajaxSettings, ajaxResponse;
  let originalAjax;

  before(function () {
    Library = class extends Backbone.Collection {
      url() {
        return '/library';
      }
    };
    attrs = {
      title: 'The Tempest',
      author: 'Bill Shakespeare',
      length: 123,
    };
  });

  beforeEach(function () {
    originalAjax = Backbone.ajax.handler;
    Backbone.ajax.handler = async function ajaxHandler(settings) {
      ajaxSettings = settings;
      var response = ajaxResponse;
      ajaxResponse = undefined;
      await Promise.resolve();
      return response;
    };

    library = new Library();
    library.create(attrs, { wait: false });
  });

  afterEach(function () {
    Backbone.ajax.handler = originalAjax;
  });

  it('read', function () {
    library.fetch();
    expect(ajaxSettings.url).to.equal('/library');
    expect(ajaxSettings.type).to.equal('GET');
    expect(ajaxSettings.dataType).to.equal('json');
    expect(_.isEmpty(ajaxSettings.data)).to.be.ok;
  });

  it('passing data', function () {
    library.fetch({ data: { a: 'a', one: 1 } });
    expect(ajaxSettings.url).to.equal('/library');
    expect(ajaxSettings.data.a).to.equal('a');
    expect(ajaxSettings.data.one).to.equal(1);
  });

  it('create', function () {
    let data = JSON.parse(ajaxSettings.data);
    expect(ajaxSettings.url).to.equal('/library');
    expect(ajaxSettings.type).to.equal('POST');
    expect(ajaxSettings.dataType).to.equal('json');
    expect(data.title).to.equal('The Tempest');
    expect(data.author).to.equal('Bill Shakespeare');
    expect(data.length).to.equal(123);
  });

  it('update', function () {
    library.first().save({ id: '1-the-tempest', author: 'William Shakespeare' });
    let data = JSON.parse(ajaxSettings.data);
    expect(ajaxSettings.url).to.equal('/library/1-the-tempest');
    expect(ajaxSettings.type).to.equal('PUT');
    expect(ajaxSettings.dataType).to.equal('json');
    expect(data.id).to.equal('1-the-tempest');
    expect(data.title).to.equal('The Tempest');
    expect(data.author).to.equal('William Shakespeare');
    expect(data.length).to.equal(123);
  });

  it('read model', function () {
    library.first().save({ id: '2-the-tempest', author: 'Tim Shakespeare' });
    library.first().fetch();
    expect(ajaxSettings.url).to.equal('/library/2-the-tempest');
    expect(ajaxSettings.type).to.equal('GET');
    expect(_.isEmpty(ajaxSettings.data)).to.be.ok;
  });

  it('destroy', function () {
    library.first().save({ id: '2-the-tempest', author: 'Tim Shakespeare' });
    library.first().destroy({ wait: true });
    expect(ajaxSettings.url).to.equal('/library/2-the-tempest');
    expect(ajaxSettings.type).to.equal('DELETE');
    expect(ajaxSettings.data).to.be.undefined;
  });

  it('urlError', function (done) {
    var model = new Backbone.Model();
    try {
      model.fetch();
    } catch (e) {
      model.fetch({ url: '/one/two' });
      expect(ajaxSettings.url).to.equal('/one/two');
      done();
    }
  });

  it('#1052 - `options` is optional.', function () {
    var model = new Backbone.Model();
    model.url = '/test';
    Backbone.sync.handler('create', model);
    // No expectation needed, ensuring no error is thrown
  });

  it('Backbone.ajax', function (done) {
    Backbone.ajax.handler = function (settings) {
      expect(settings.url).to.equal('/test');
      done();
      return Promise.resolve();
    };
    var model = new Backbone.Model();
    model.url = '/test';
    Backbone.sync.handler('create', model);
  });

  it('Call provided error callback on error.', function (done) {
    var model = new Backbone.Model();
    model.url = '/test';
    Backbone.sync.handler('read', model, {
      error: function () {
        expect(true).to.be.ok;
        done();
      },
    });
    ajaxSettings.error();
  });

  it('isLoading with customized sync method.', function () {
    class SpecialSyncModel extends Backbone.Model {
      sync() {
        return Promise.resolve({ x: 'y' });
      }
    }
    var model = new SpecialSyncModel();
    model.url = '/test';
    expect(model.isLoading).to.equal(false);
    model
      .fetch({
        success() {
          expect(model.isLoading).to.equal(false);
        },
      })
      .then(function () {
        expect(model.isLoading).to.equal(false);
      });
    expect(model.isLoading).to.equal(true);
  });

  it('#2928 - Pass along `textStatus` and `errorThrown`.', function (done) {
    var model = new Backbone.Model();
    model.url = '/test';
    model.on('error', function (m, error) {
      expect(error).to.be.an('error');
      expect(error.responseData).to.deep.equal({ message: 'oh no!' });
      expect(error.textStatus).to.equal('textStatus');
      done();
    });
    var ajax = Backbone.ajax.handler;
    Backbone.ajax.handler = function () {
      var error = new Error('not found');
      error.textStatus = 'textStatus';
      error.responseData = { message: 'oh no!' };
      return Promise.reject(error);
    };
    model.fetch();
    Backbone.ajax.handler = ajax;
  });
});

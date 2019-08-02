global.XMLHttpRequest = function() {
  this.withCredentials = true;
};

var sinon = require('sinon');
var expect = require('chai').expect;
var Backbone = require('../../nextbone');

(function() {
  if (typeof window === 'undefined') global.self = {};
  require('whatwg-fetch');
  global.fetch = sinon.spy(self.fetch);
})();

var ajax = Backbone.ajax.handler;

describe('backbone.fetch', function() {
  var server;

  beforeEach(function() {
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  describe('creating a request', function() {
    it('should pass the method and url to fetch', function() {
      ajax({
        url: 'test',
        type: 'GET'
      });

      sinon.assert.calledWith(fetch, 'test', sinon.match.has('method', 'GET'));
      sinon.assert.calledWith(fetch, 'test', sinon.match.has('body', undefined));
    });

    it('should stringify GET data when present', function() {
      ajax({
        url: 'test',
        type: 'GET',
        data: { a: 1, b: 2 }
      });
      sinon.assert.calledWith(fetch, 'test?a=1&b=2');
    });

    it('should append to the querystring when one already present', function() {
      ajax({
        url: 'test?foo=bar',
        type: 'GET',
        data: { a: 1, b: 2 }
      });
      sinon.assert.calledWith(fetch, 'test?foo=bar&a=1&b=2');
    });

    it('should send POSTdata when POSTing', function() {
      ajax({
        url: 'test',
        type: 'POST',
        data: JSON.stringify({ a: 1, b: 2 })
      });

      sinon.assert.calledWith(fetch, 'test', sinon.match.has('method', 'POST'));
      sinon.assert.calledWith(fetch, 'test', sinon.match.has('body', '{"a":1,"b":2}'));
    });
  });

  describe('headers', function() {
    it('should set headers if none passed in', function() {
      ajax({ url: 'test', type: 'GET' });
      sinon.assert.calledWith(
        fetch,
        'test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    it('should use headers if passed in', function() {
      ajax({
        url: 'test',
        type: 'GET',
        headers: {
          'X-MyApp-Header': 'present'
        }
      });

      sinon.assert.calledWith(
        fetch,
        'test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-MyApp-Header': 'present'
          }
        })
      );
    });

    it('allows Accept and Content-Type headers to be overwritten', function() {
      ajax({
        url: 'test',
        type: 'GET',
        headers: {
          Accept: 'custom',
          'Content-Type': 'custom',
          'X-MyApp-Header': 'present'
        }
      });

      sinon.assert.calledWith(
        fetch,
        'test',
        sinon.match({
          headers: {
            Accept: 'custom',
            'Content-Type': 'custom',
            'X-MyApp-Header': 'present'
          }
        })
      );
    });
  });

  describe('finishing a request', function() {
    it('should invoke the success callback on complete', function() {
      var promise = ajax({
        url: 'test',
        type: 'GET',
        success: function(response) {
          expect(response).to.equal('ok');
        }
      });
      server.respond('ok');
      return promise;
    });

    it('should parse response as json if dataType option is provided', function() {
      var promise = ajax({
        url: 'test',
        dataType: 'json',
        type: 'GET',
        success: function(response) {
          expect(response).to.deep.equal({ status: 'ok' });
        }
      }).then(function(response) {
        expect(response).to.deep.equal({ status: 'ok' });
      });
      server.respond('{"status": "ok"}');
      return promise;
    });

    it('should invoke the error callback on error', function(done) {
      var promise = ajax({
        url: 'test',
        type: 'GET',
        success: function(response) {
          throw new Error('this request should fail');
        },
        error: function(error) {
          expect(error.response.status).to.equal(400);
        }
      });

      promise
        .then(function() {
          throw new Error('this request should fail');
        })
        .catch(function(error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        .catch(function(error) {
          done(error);
        });

      server.respond([400, {}, 'Server error']);
    });

    it('should not fail without error callback', function(done) {
      var promise = ajax({
        url: 'test',
        type: 'GET',
        success: function(response) {
          throw new Error('this request should fail');
        }
      });

      promise
        .then(function() {
          throw new Error('this request should fail');
        })
        .catch(function(error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        .catch(function(error) {
          done(error);
        });

      server.respond([400, {}, 'Server error']);
    });

    it('should parse json as property of Error on failing request', function(done) {
      var promise = ajax({
        dataType: 'json',
        url: 'test',
        type: 'GET'
      });

      promise
        .then(function() {
          throw new Error('this request should fail');
        })
        .catch(function(error) {
          expect(error.responseData).to.deep.equal({ code: 'INVALID_HORSE' });
          done();
        })
        .catch(function(error) {
          done(error);
        });

      server.respond([400, {}, JSON.stringify({ code: 'INVALID_HORSE' })]);
    });

    it('should handle invalid JSON response on failing response', function(done) {
      var promise = ajax({
        url: 'test',
        dataType: 'json',
        type: 'GET',
        success: function(response) {
          throw new Error('this request should fail');
        },
        error: function(error) {
          expect(error.response.status).to.equal(400);
        }
      });

      promise
        .then(function() {
          throw new Error('this request should fail');
        })
        .catch(function(error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        .catch(function(error) {
          done(error);
        });

      server.respond([400, {}, 'Server error']);
    });

    it('should parse text as property of Error on failing request', function(done) {
      var promise = ajax({
        dataType: 'text',
        url: 'test',
        type: 'GET'
      });

      promise
        .then(function() {
          throw new Error('this request should fail');
        })
        .catch(function(error) {
          expect(error.responseData).to.equal('Nope');
          done();
        })
        .catch(function(error) {
          done(error);
        });

      server.respond([400, {}, 'Nope']);
    });
  });

  it.skip('should pass through network errors', function(done) {
    var promise = ajax({
      dataType: 'text',
      url: 'test',
      type: 'GET'
    });

    promise
      .then(function() {
        throw new Error('this request should fail');
      })
      .catch(function(error) {
        console.log(error);
        expect(error).to.be.an.instanceof(TypeError);
        expect(error).not.to.have.property('response');
        expect(error.message).to.equal('Network request failed');
        done();
      })
      .catch(function(error) {
        done(error);
      });

    server.respond([600, {}, 'Network error']);
    return promise;
  });

  describe('Promise', function() {
    it('should return a Promise', function() {
      var xhr = ajax({ url: 'test', type: 'GET' });
      expect(xhr).to.be.an.instanceof(Promise);
    });
  });
});

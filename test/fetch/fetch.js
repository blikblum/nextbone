import { mock } from 'node:test';
import sinon from 'sinon';
import { expect } from 'chai';
import * as Backbone from '../../nextbone.js';

var ajax = Backbone.ajax.handler;

describe('fetch', function () {
  const fetchSpy = sinon.spy();
  let textResponse = '';
  let responseStatus = 200;
  function text() {
    return textResponse;
  }

  beforeEach(function () {
    textResponse = '';
    responseStatus = 200;
    mock.method(global, 'fetch', async (...args) => {
      fetchSpy(...args);
      return new Response(textResponse, {
        status: responseStatus,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  afterEach(function () {
    fetchSpy.resetHistory();
    mock.reset();
  });

  describe('creating a request', function () {
    it('should pass the method and url to fetch', function () {
      ajax({
        url: 'http://test',
        type: 'GET',
      });

      sinon.assert.calledWith(fetchSpy, 'http://test', sinon.match.has('method', 'GET'));
      sinon.assert.calledWith(fetchSpy, 'http://test', sinon.match.has('body', undefined));
    });

    it('should stringify GET data when present', function () {
      ajax({
        url: 'test',
        type: 'GET',
        data: { a: 1, b: 2 },
      });
      sinon.assert.calledWith(fetchSpy, 'test?a=1&b=2');
    });

    it('should append to the querystring when one already present', function () {
      ajax({
        url: 'test?foo=bar',
        type: 'GET',
        data: { a: 1, b: 2 },
      });
      sinon.assert.calledWith(fetchSpy, 'test?foo=bar&a=1&b=2');
    });

    it('should send POSTdata when POSTing', function () {
      ajax({
        url: 'test',
        type: 'POST',
        data: JSON.stringify({ a: 1, b: 2 }),
      });

      sinon.assert.calledWith(fetchSpy, 'test', sinon.match.has('method', 'POST'));
      sinon.assert.calledWith(fetchSpy, 'test', sinon.match.has('body', '{"a":1,"b":2}'));
    });
  });

  describe('headers', function () {
    it('should set headers if none passed in', function () {
      ajax({ url: 'test', type: 'GET' });
      sinon.assert.calledWith(
        fetchSpy,
        'test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }),
      );
    });

    it('should use headers if passed in', function () {
      ajax({
        url: 'test',
        type: 'GET',
        headers: {
          'X-MyApp-Header': 'present',
        },
      });

      sinon.assert.calledWith(
        fetchSpy,
        'test',
        sinon.match({
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-MyApp-Header': 'present',
          },
        }),
      );
    });

    it('allows Accept and Content-Type headers to be overwritten', function () {
      ajax({
        url: 'test',
        type: 'GET',
        headers: {
          Accept: 'custom',
          'Content-Type': 'custom',
          'X-MyApp-Header': 'present',
        },
      });

      sinon.assert.calledWith(
        fetchSpy,
        'test',
        sinon.match({
          headers: {
            Accept: 'custom',
            'Content-Type': 'custom',
            'X-MyApp-Header': 'present',
          },
        }),
      );
    });
  });

  describe('finishing a request', function () {
    it('should invoke the success callback on complete', function () {
      textResponse = 'ok';
      return ajax({
        url: 'http://test',
        type: 'GET',
        success: function (response) {
          expect(response).to.equal('ok');
        },
      });
    });

    it('should parse response as json if dataType option is provided', function () {
      textResponse = JSON.stringify({ status: 'ok' });
      return ajax({
        url: 'http://test',
        dataType: 'json',
        type: 'GET',
        success: function (response) {
          expect(response).to.deep.equal({ status: 'ok' });
        },
      }).then(function (response) {
        expect(response).to.deep.equal({ status: 'ok' });
      });
    });

    it('should invoke the error callback on error', function (done) {
      textResponse = 'Server error';
      responseStatus = 400;
      var promise = ajax({
        url: 'test',
        type: 'GET',
        success: function (response) {
          throw new Error('this request should fail');
        },
        error: function (error) {
          expect(error.response.status).to.equal(400);
        },
      });

      promise
        .then(function () {
          throw new Error('this request should fail');
        })
        ['catch'](function (error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        ['catch'](function (error) {
          done(error);
        });
    });

    it('should not fail without error callback', function (done) {
      textResponse = 'Server error';
      responseStatus = 400;
      var promise = ajax({
        url: 'test',
        type: 'GET',
        success: function (response) {
          throw new Error('this request should fail');
        },
      });

      promise
        .then(function () {
          throw new Error('this request should fail');
        })
        ['catch'](function (error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        ['catch'](function (error) {
          done(error);
        });
    });

    it('should parse json as property of Error on failing request', function (done) {
      textResponse = JSON.stringify({ code: 'INVALID_HORSE' });
      responseStatus = 400;
      var promise = ajax({
        dataType: 'json',
        url: 'test',
        type: 'GET',
      });

      promise
        .then(function () {
          throw new Error('this request should fail');
        })
        ['catch'](function (error) {
          expect(error.responseData).to.deep.equal({ code: 'INVALID_HORSE' });
          done();
        })
        ['catch'](function (error) {
          done(error);
        });
    });

    it('should handle invalid JSON response on failing response', function (done) {
      textResponse = 'Server error';
      responseStatus = 400;
      var promise = ajax({
        url: 'test',
        dataType: 'json',
        type: 'GET',
        success: function (response) {
          throw new Error('this request should fail');
        },
        error: function (error) {
          expect(error.response.status).to.equal(400);
        },
      });

      promise
        .then(function () {
          throw new Error('this request should fail');
        })
        ['catch'](function (error) {
          expect(error.response.status).to.equal(400);
          done();
        })
        ['catch'](function (error) {
          done(error);
        });
    });

    it('should parse text as property of Error on failing request', function (done) {
      textResponse = 'Nope';
      responseStatus = 400;
      var promise = ajax({
        dataType: 'text',
        url: 'test',
        type: 'GET',
      });

      promise
        .then(function () {
          throw new Error('this request should fail');
        })
        ['catch'](function (error) {
          expect(error.responseData).to.equal('Nope');
          done();
        })
        ['catch'](function (error) {
          done(error);
        });
    });
  });

  it.skip('should pass through network errors', function (done) {
    // Simulate a network error by not resolving the fetch promise
    textResponse = 'Network error';
    responseStatus = 600; // Non-standard status code to simulate a network error
    var promise = ajax({
      dataType: 'text',
      url: 'test',
      type: 'GET',
    });

    promise
      .then(function () {
        throw new Error('this request should fail');
      })
      ['catch'](function (error) {
        expect(error).to.be.an['instanceof'](TypeError);
        expect(error).not.to.have.property('response');
        expect(error.message).to.equal('Network request failed');
        done();
      })
      ['catch'](function (error) {
        done(error);
      });

    return promise;
  });

  describe('Promise', function () {
    it('should return a Promise', function () {
      var xhr = ajax({ url: 'test', type: 'GET' });
      expect(xhr).to.be.an['instanceof'](Promise);
    });
  });
});

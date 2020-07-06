require('@babel/register')({
  // This will override `node_modules` ignoring
  ignore: [
    function(filepath) {
      const result = (filepath.indexOf('node_modules') !== -1 && !filepath.match(/lodash-es/));
      return result;
    }
  ]
});

const assert = require('chai').assert;

global.Backbone = require('../../nextbone');
const Validation = require('../../validation');
global.sinon = require('sinon');

global.Backbone.Validation = Validation;
global.withValidation = Validation.withValidation;

global.assert = assert;

assert.defined = assert.isDefined;
assert.equals = assert.deepEqual;
assert.contains = assert.include;
assert.same = assert.strictEqual;
assert.exception = assert['throws'];
assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

global.refute = assert.isNotOk;
refute.contains = assert.notInclude;
refute.defined = assert.isUndefined;
refute.same = assert.notStrictEqual;
refute.exception = assert.doesNotThrow;
refute.calledWith = sinon.assert.neverCalledWith;

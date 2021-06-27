import { assert } from 'chai';
import * as Backbone from '../../nextbone.js';
import * as Validation from '../../validation.js';
import sinon from 'sinon';

global.sinon = sinon;
global.Backbone = Backbone;

global.Validation = Validation;
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

import { createRequire } from 'node:module';

import * as Backbone from '../../nextbone.js';
import * as Validation from '../../validation.js';

const require = createRequire(import.meta.url);
const { assert } = require('chai');
const sinon = require('sinon');

globalThis.sinon = sinon;
globalThis.Backbone = Backbone;
globalThis.Validation = Validation;
globalThis.withValidation = Validation.withValidation;
globalThis.assert = assert;

assert.defined = assert.isDefined;
assert.equals = assert.deepEqual;
assert.contains = assert.include;
assert.same = assert.strictEqual;
assert.exception = assert.throws;
assert.called = sinon.assert.called;
assert.calledWith = sinon.assert.calledWith;

const refute = assert.isNotOk;

refute.contains = assert.notInclude;
refute.defined = assert.isUndefined;
refute.same = assert.notStrictEqual;
refute.exception = assert.doesNotThrow;
refute.calledWith = sinon.assert.neverCalledWith;

globalThis.refute = refute;

export { Backbone, Validation, assert, refute, sinon };

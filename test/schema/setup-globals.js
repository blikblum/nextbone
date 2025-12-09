import { assert } from 'chai';
import * as Backbone from '../../nextbone.js';
import * as Schema from '../../schema.js';
import * as zod from 'zod';
import sinon from 'sinon';

global.sinon = sinon;
global.Backbone = Backbone;
global.z = zod.z;

global.Schema = Schema;
global.withSchema = Schema.withSchema;

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

import { beforeEach, describe, it } from 'vitest';

import { assert, sinon } from './vitest-globals.js';
import { Collection, Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet } from './test-helpers.js';

describe('Nested validation', () => {
  describe('one level', () => {
    class OneLevelModel extends withValidation(Model<{ address?: { street?: string } }>) {
      static validation = {
        'address.street': {
          required: true,
          msg: 'error',
        },
      };
    }

    let invalid: any;
    let model: OneLevelModel;
    let valid: any;

    beforeEach(() => {
      valid = sinon.spy();
      invalid = sinon.spy();
      model = new OneLevelModel();
    });

    describe('invalid', () => {
      beforeEach(() => {
        expectInvalidSet(
          model,
          {
            address: {
              street: '',
            },
          },
          { 'address.street': 'error' },
          { invalid, valid },
        );
      });

      it('calls the invalid callback', () => {
        assert.calledWith(invalid, 'address.street', 'error');
      });

      it('is valid returns false for the specified attribute name', () => {
        assert.isFalse(model.isValid('address.street'));
      });

      it('is valid returns false for the specified attribute names', () => {
        assert.isFalse(model.isValid(['address.street', 'address.street']));
      });

      it('pre validate returns error message for the specified attribute name', () => {
        assert(model.preValidate('address.street', ''));
      });
    });

    describe('valid', () => {
      beforeEach(() => {
        expectValidSet(
          model,
          {
            address: {
              street: 'name',
            },
          },
          { valid },
        );
      });

      it('calls the valid callback', () => {
        assert.calledWith(valid, 'address.street');
      });

      it('is valid returns true for the specified attribute name', () => {
        assert(model.isValid('address.street'));
      });

      it('is valid returns true for the specified attribute names', () => {
        assert(model.isValid(['address.street', 'address.street']));
      });

      it('pre validate returns no error message for the specified attribute name', () => {
        assert.isNotOk(model.preValidate('address.street', 'street'));
      });
    });
  });

  describe('two levels', () => {
    class TwoLevelModel extends withValidation(Model<{ foo?: { bar?: { baz?: string } } }>) {
      static validation = {
        'foo.bar.baz': {
          required: true,
          msg: 'error',
        },
      };
    }

    let invalid: any;
    let model: TwoLevelModel;
    let valid: any;

    beforeEach(() => {
      valid = sinon.spy();
      invalid = sinon.spy();
      model = new TwoLevelModel();
    });

    describe('invalid', () => {
      beforeEach(() => {
        expectInvalidSet(
          model,
          {
            foo: {
              bar: {
                baz: '',
              },
            },
          },
          { 'foo.bar.baz': 'error' },
          { invalid, valid },
        );
      });

      it('calls the invalid callback', () => {
        assert.calledWith(invalid, 'foo.bar.baz', 'error');
      });

      it('is valid returns false for the specified attribute name', () => {
        assert.isFalse(model.isValid('foo.bar.baz'));
      });

      it('is valid returns false for the specified attribute names', () => {
        assert.isFalse(model.isValid(['foo.bar.baz', 'foo.bar.baz']));
      });

      it('pre validate returns error message for the specified attribute name', () => {
        assert(model.preValidate('foo.bar.baz', ''));
      });
    });

    describe('valid', () => {
      beforeEach(() => {
        expectValidSet(
          model,
          {
            foo: {
              bar: {
                baz: 'val',
              },
            },
          },
          { invalid, valid },
        );
      });

      it('calls the valid callback', () => {
        assert.calledWith(valid, 'foo.bar.baz');
      });

      it('is valid returns true for the specified attribute name', () => {
        assert(model.isValid('foo.bar.baz'));
      });

      it('is valid returns true for the specified attribute names', () => {
        assert(model.isValid(['foo.bar.baz', 'foo.bar.baz']));
      });

      it('pre validate returns no error message for the specified attribute name', () => {
        assert.isNotOk(model.preValidate('foo.bar.baz', 'val'));
      });
    });
  });

  describe('complex nesting', () => {
    class ComplexNestedModel extends withValidation(
      Model<{ foo?: { bar?: { baz?: string }; foo?: string } }>,
    ) {
      static validation = {
        'foo.bar.baz': {
          required: true,
          msg: 'error',
        },
        'foo.foo': {
          required: true,
          msg: 'error',
        },
      };
    }

    let invalid: any;
    let model: ComplexNestedModel;
    let valid: any;

    beforeEach(() => {
      valid = sinon.spy();
      invalid = sinon.spy();
      model = new ComplexNestedModel();
    });

    describe('invalid', () => {
      beforeEach(() => {
        expectInvalidSet(
          model,
          {
            foo: {
              foo: '',
              bar: {
                baz: '',
              },
            },
          },
          { 'foo.bar.baz': 'error', 'foo.foo': 'error' },
          { invalid, valid },
        );
      });

      it('calls the invalid callback', () => {
        assert.calledWith(invalid, 'foo.bar.baz', 'error');
        assert.calledWith(invalid, 'foo.foo', 'error');
      });

      it('is valid returns false for the specified attribute name', () => {
        assert.isFalse(model.isValid('foo.bar.baz'));
        assert.isFalse(model.isValid('foo.foo'));
      });

      it('is valid returns false for the specified attribute names', () => {
        assert.isFalse(model.isValid(['foo.foo', 'foo.bar.baz']));
      });

      it('pre validate returns error message for the specified attribute name', () => {
        assert(model.preValidate('foo.bar.baz', ''));
        assert(model.preValidate('foo.foo', ''));
      });
    });

    describe('valid', () => {
      beforeEach(() => {
        expectValidSet(
          model,
          {
            foo: {
              foo: 'val',
              bar: {
                baz: 'val',
              },
            },
          },
          { invalid, valid },
        );
      });

      it('calls the valid callback', () => {
        assert.calledWith(valid, 'foo.bar.baz');
        assert.calledWith(valid, 'foo.foo');
      });

      it('is valid returns true for the specified attribute name', () => {
        assert(model.isValid('foo.bar.baz'));
        assert(model.isValid('foo.foo'));
      });

      it('is valid returns true for the specified attribute names', () => {
        assert(model.isValid(['foo.bar.baz', 'foo.foo']));
      });

      it('pre validate returns no error message for the specified attribute name', () => {
        assert.isNotOk(model.preValidate('foo.bar.baz', 'val'));
        assert.isNotOk(model.preValidate('foo.foo', 'val'));
      });
    });
  });

  describe('complex nesting with intermediate-level validators', () => {
    type NestedValue = { baz?: string | number; qux?: string | number };

    class IntermediateValidatorModel extends withValidation(
      Model<{ foo?: { bar?: NestedValue; foo?: NestedValue } }>,
    ) {
      static validation = {
        'foo.bar': {
          fn: 'validateBazAndQux',
          msg: 'bazQuxError1',
        },
        'foo.foo': {
          fn: 'validateBazAndQux',
          msg: 'bazQuxError2',
        },
      } as any;

      validateBazAndQux(value?: NestedValue) {
        if (!value || !value.baz || !value.qux) {
          return 'error';
        }
      }
    }

    let invalid: any;
    let model: IntermediateValidatorModel;
    let valid: any;

    beforeEach(() => {
      valid = sinon.spy();
      invalid = sinon.spy();
      model = new IntermediateValidatorModel();
    });

    describe('invalid', () => {
      beforeEach(() => {
        expectInvalidSet(
          model,
          {
            foo: {
              bar: {
                baz: '',
                qux: 'qux',
              },
              foo: {
                baz: 'baz',
                qux: '',
              },
            },
          },
          { 'foo.bar': 'bazQuxError1', 'foo.foo': 'bazQuxError2' },
          { invalid, valid },
        );
      });

      it('calls the invalid callback', () => {
        assert.calledWith(invalid, 'foo.bar', 'bazQuxError1');
        assert.calledWith(invalid, 'foo.foo', 'bazQuxError2');
      });

      it('isValid returns false for the specified attribute name', () => {
        assert.isFalse(model.isValid('foo.bar'));
        assert.isFalse(model.isValid('foo.foo'));
      });

      it('isValid returns false for the specified attribute names', () => {
        assert.isFalse(model.isValid(['foo.foo', 'foo.bar']));
      });

      it('preValidate returns error message for the specified attribute name', () => {
        assert(model.preValidate('foo.bar', ''));
        assert(model.preValidate('foo.foo', ''));
      });

      it('preValidate does not return error message if new nested values validate', () => {
        assert.isNotOk(model.preValidate('foo.bar', { baz: 1, qux: 1 }));
        assert.isNotOk(model.preValidate('foo.foo', { baz: 1, qux: 1 }));
      });
    });

    describe('valid', () => {
      beforeEach(() => {
        expectValidSet(
          model,
          {
            foo: {
              bar: {
                baz: 'val',
                qux: 'val',
              },
              foo: {
                baz: 'val',
                qux: 'val',
              },
            },
          },
          { invalid, valid },
        );
      });

      it('calls the valid callback', () => {
        assert.calledWith(valid, 'foo.bar');
        assert.calledWith(valid, 'foo.foo');
      });

      it('isValid returns true for the specified attribute name', () => {
        assert(model.isValid('foo.bar'));
        assert(model.isValid('foo.foo'));
      });

      it('isValid returns true for the specified attribute names', () => {
        assert(model.isValid(['foo.bar', 'foo.foo']));
      });

      it('preValidate returns no error message for the specified attribute name', () => {
        assert.isNotOk(model.preValidate('foo.bar', { baz: 1, qux: 1 }));
        assert.isNotOk(model.preValidate('foo.foo', { baz: 1, qux: 1 }));
      });

      it('preValidate returns error message if new nested values do not validate', () => {
        assert.equals(model.preValidate('foo.bar', { baz: '', qux: '' }), 'bazQuxError1');
        assert.equals(model.preValidate('foo.foo', { baz: '', qux: '' }), 'bazQuxError2');
      });
    });
  });

  describe('nested models and collections', () => {
    it('are ignored', () => {
      const model = new Model();
      model.set({
        model,
        collection: new Collection([model]),
      });

      assert.same(
        model.set(
          {
            foo: 'bar',
          },
          { validate: true },
        ),
        model,
      );
      assert.same(model.validationError, null);
    });
  });
});

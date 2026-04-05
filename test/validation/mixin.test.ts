import { beforeEach, describe, it } from 'vitest';

import { assert } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet } from './test-helpers.js';

type ModelAttributes = {
  name?: string;
  someAttr?: string;
};

const createValidatedModel = () => {
  class TestModel extends withValidation(Model<ModelAttributes>) {
    static validation = {
      name: (value?: string) => {
        if (!value) {
          return 'error';
        }
      },
    } as any;
  }

  return new TestModel();
};

describe('Mixin validation', () => {
  let model: ReturnType<typeof createValidatedModel>;

  beforeEach(() => {
    model = createValidatedModel();
  });

  it('isValid is false when model is invalid', () => {
    assert.equals(model.isValid(true), false);
  });

  it('isValid is true when model is valid', () => {
    model.set({ name: 'name' });

    assert.equals(model.isValid(true), true);
  });

  it('refutes setting invalid value', () => {
    expectInvalidSet(model, { name: '' }, { name: 'error' });
  });

  it('succeeds setting valid value', () => {
    expectValidSet(model, { name: 'name' });
  });

  describe('when setting attribute on model without validation', () => {
    let plainModel: Model<ModelAttributes>;

    beforeEach(() => {
      plainModel = new Model<ModelAttributes>();
    });

    it('it should not complain', () => {
      assert.same(plainModel.set({ someAttr: 'someValue' }, { validate: true }), plainModel);
      assert.same(plainModel.validationError, null);
    });
  });
});
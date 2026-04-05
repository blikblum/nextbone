import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

type TestAttributes = {
  age?: number;
  name?: string;
  password?: string;
  email?: string;
};

class TestModel extends withValidation(Model<TestAttributes>) {
  static validation = {
    age: {
      required: true,
    },
    name: {
      required: true,
    },
    password: {
      required: true,
    },
    email: {
      pattern: 'email',
    },
  };
}

const validateAllAttributes = null as unknown as Partial<TestAttributes>;

describe('Setting options.attributes', () => {
  let model: TestModel;

  beforeEach(() => {
    model = new TestModel();
  });

  it('exposes preValidate on the typed mixin instance', () => {
    const error = model.preValidate('name', '');

    assert.strictEqual(error, 'Name is required');
  });

  describe('through Model.validate options', () => {
    it('only the attributes in array should be validated', () => {
      const errors = model.validate(validateAllAttributes, {
        attributes: ['name', 'age'],
      }) as Partial<Record<keyof TestAttributes, string>>;

      assert.isDefined(errors.name);
      assert.isDefined(errors.age);
      assert.isUndefined(errors.password);
      assert.isUndefined(errors.email);
    });

    describe('when all the attributes in array are valid', () => {
      beforeEach(() => {
        model.set({
          age: 1,
          name: 'hello',
          email: 'invalidemail',
        });
      });

      it('validation will pass', () => {
        const errors = model.validate(validateAllAttributes, {
          attributes: ['name', 'age'],
        });

        assert.isUndefined(errors);
      });
    });
  });
});

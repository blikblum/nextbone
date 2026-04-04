import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';
import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type TestAttributes = {
  age?: number;
  email?: string;
  name?: string;
  password?: string;
};

const schema = z.object({
  age: z.number({ message: 'Age is required' }),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
  email: z.email('Invalid email'),
});

class TestModel extends withSchema(Model<TestAttributes>) {
  static schema = schema;
}

describe('Setting options.attributes', () => {
  let model: TestModel;

  beforeEach(() => {
    model = new TestModel();
  });

  describe('through Model.validate options', () => {
    it('only the attributes in array should be validated', () => {
      const errors = model.validate(undefined, {
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
        const errors = model.validate(undefined, {
          attributes: ['name', 'age'],
        });

        assert.isUndefined(errors);
      });
    });
  });
});

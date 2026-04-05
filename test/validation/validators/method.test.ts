import { beforeEach, describe, it } from 'vitest';

import { Validation, assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

describe('method validator using other built in validator(s)', () => {
  class TestModel extends withValidation(Model<{ name?: string }>) {
    static validation = {
      name: (value: string, attr: string) => {
        return Validation.validators.length(value, attr, 4, this);
      },
    } as any;
  }

  let model: TestModel;

  beforeEach(() => {
    Object.assign(TestModel.prototype, Validation.mixin);
    model = new TestModel();
  });

  it('it should format the error message returned from the built in validator', () => {
    assert.equals('Name must be 4 characters', model.preValidate('name', ''));
  });
});
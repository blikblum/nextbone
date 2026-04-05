import { afterEach, beforeEach, describe, it } from 'vitest';

import { Validation, assert, sinon } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

describe('Overriding default callbacks in Validation', () => {
  let invalid: any;
  let originalOptions: Record<string, unknown>;
  let valid: any;

  const createModel = () => {
    class TestModel extends withValidation(Model<{ age?: number }>) {
      static validation = {
        age: (value?: number) => {
          if (value === 0) {
            return 'Age is invalid';
          }
        },
      } as any;
    }

    return new TestModel();
  };

  beforeEach(() => {
    originalOptions = { ...Validation.options };
    valid = sinon.spy();
    invalid = sinon.spy();

    Object.assign(Validation.options, {
      valid,
      invalid,
    });
  });

  afterEach(() => {
    Object.assign(Validation.options, originalOptions);
  });

  it('validate should call overridden valid callback', () => {
    const model = createModel();

    model.set({ age: 1 }, { validate: true });

    assert.called(valid);
    assert.same(model.validationError, null);
  });

  it('validate should call overridden invalid callback', () => {
    const model = createModel();

    model.set({ age: 0 }, { validate: true });

    assert.called(invalid);
    assert.equals(model.validationError, { age: 'Age is invalid' });
  });
});

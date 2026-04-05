import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

describe('named method validator short hand syntax', () => {
  let attrName: string | undefined;
  let computedState: Record<string, unknown> | undefined;
  let ctx: unknown;

  class TestModel extends withValidation(Model<{ age?: number; attr?: string; name?: string }>) {
    static validation = {
      name: 'validateName',
    } as any;

    validateName(value: string, attr: string, computed: Record<string, unknown>) {
      ctx = this;
      attrName = attr;
      computedState = computed;
      if (value !== 'backbone') {
        return 'Error';
      }
    }
  }

  let model: TestModel;

  beforeEach(() => {
    attrName = undefined;
    computedState = undefined;
    ctx = undefined;
    model = new TestModel();
  });

  it('is invalid when method returns error message', () => {
    model.set({ name: '' }, { validate: true });

    assert.equals(model.validationError, { name: 'Error' });
  });

  it('is valid when method returns undefined', () => {
    model.set({ name: 'backbone' }, { validate: true });

    assert.same(model.validationError, null);
  });

  it('context is the model', () => {
    model.set({ name: '' }, { validate: true });

    assert.same(ctx, model);
  });

  it('second argument is the name of the attribute being validated', () => {
    model.set({ name: '' }, { validate: true });

    assert.equals(attrName, 'name');
  });

  it('third argument is a computed model state', () => {
    model.set({ attr: 'attr' });
    model.set(
      {
        name: 'name',
        age: 1,
      },
      { validate: true },
    );

    assert.equals(computedState, { attr: 'attr', name: 'name', age: 1 });
  });
});
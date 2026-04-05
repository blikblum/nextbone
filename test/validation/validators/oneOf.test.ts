import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type CountryAttributes = {
  country?: string | null;
};

type MutableValidation = {
  country: {
    oneOf: string[];
    required?: boolean;
  };
};

describe('oneOf validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;
  let validation: MutableValidation;

  function createModelClass(currentValidation: MutableValidation) {
    return class extends withValidation(Model<CountryAttributes>) {
      static validation = currentValidation as any;
    };
  }

  beforeEach(() => {
    validation = {
      country: {
        oneOf: ['Norway', 'Sweeden'],
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { country: string }]>(model, 'validated');

    expectInvalidSet(
      model,
      { country: '' },
      { country: 'Country must be one of: Norway, Sweeden' },
    );

    const [, error] = await event;
    assert.equals(error, { country: 'Country must be one of: Norway, Sweeden' });
  });

  it('value is one of the values in the array is valid', () => {
    expectValidSet(model, { country: 'Norway' });
  });

  it('value is not one of the values in the arraye is invalid', () => {
    expectInvalidSet(model, { country: 'Denmark' });
  });

  it('is case sensitive', () => {
    expectInvalidSet(model, { country: 'sweeden' });
  });

  describe('when required is not specified', () => {
    it('undefined is invalid', () => {
      expectInvalidSet(model, { country: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { country: null });
    });
  });

  describe('when required:false', () => {
    beforeEach(() => {
      validation.country.required = false;
    });

    it('null is valid', () => {
      expectValidSet(model, { country: null });
    });

    it('undefined is valid', () => {
      expectValidSet(model, { country: undefined });
    });
  });

  describe('when required:true', () => {
    beforeEach(() => {
      validation.country.required = true;
    });

    it('undefined is invalid', () => {
      expectInvalidSet(model, { country: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { country: null });
    });
  });
});

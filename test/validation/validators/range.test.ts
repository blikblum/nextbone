import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type AgeAttributes = {
  age?: number | null;
};

type MutableValidation = {
  age: {
    range: [number, number];
    required?: boolean;
  };
};

describe('range validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;
  let validation: MutableValidation;

  function createModelClass(currentValidation: MutableValidation) {
    return class extends withValidation(Model<AgeAttributes>) {
      static validation = currentValidation as any;
    };
  }

  beforeEach(() => {
    validation = {
      age: {
        range: [1, 10],
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { age: string }]>(model, 'validated');

    expectInvalidSet(model, { age: 0 }, { age: 'Age must be between 1 and 10' });

    const [, error] = await event;
    assert.equals(error, { age: 'Age must be between 1 and 10' });
  });

  it('number lower than first value is invalid', () => {
    expectInvalidSet(model, { age: 0 });
  });

  it('number equal to first value is valid', () => {
    expectValidSet(model, { age: 1 });
  });

  it('number higher than last value is invalid', () => {
    expectInvalidSet(model, { age: 11 });
  });

  it('number equal to last value is valid', () => {
    expectValidSet(model, { age: 10 });
  });

  it('number in range is valid', () => {
    expectValidSet(model, { age: 5 });
  });

  describe('when required is not specified', () => {
    it('undefined is invalid', () => {
      expectInvalidSet(model, { age: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { age: null });
    });
  });

  describe('when required:false', () => {
    beforeEach(() => {
      validation.age.required = false;
    });

    it('null is valid', () => {
      expectValidSet(model, { age: null });
    });

    it('undefined is valid', () => {
      expectValidSet(model, { age: undefined });
    });
  });

  describe('when required:true', () => {
    beforeEach(() => {
      validation.age.required = true;
    });

    it('undefined is invalid', () => {
      expectInvalidSet(model, { age: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { age: null });
    });
  });
});
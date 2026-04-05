import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type AgeAttributes = {
  aFloat?: number | string;
  age?: number | string | null;
};

type MutableValidation = {
  age: {
    max: number;
    required?: boolean;
  };
  aFloat?: {
    min: number;
  };
};

describe('max validator', () => {
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
        max: 10,
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { age: string }]>(model, 'validated');

    expectInvalidSet(model, { age: 11 }, { age: 'Age must be less than or equal to 10' });

    const [, error] = await event;
    assert.equals(error, { age: 'Age must be less than or equal to 10' });
  });

  it('number higher than max is invalid', () => {
    expectInvalidSet(model, { age: 11 });
  });

  it('non numeric value is invalid', () => {
    expectInvalidSet(model, { age: '10error' });
  });

  it('number equal to max is valid', () => {
    expectValidSet(model, { age: 10 });
  });

  it('number lower than max is valid', () => {
    expectValidSet(model, { age: 5 });
  });

  it('numeric string values are treated as numbers', () => {
    expectValidSet(model, { age: '10' });
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

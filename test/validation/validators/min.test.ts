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
    min: number;
    required?: boolean;
  };
  aFloat?: {
    min: number;
  };
};

describe('min validator', () => {
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
        min: 1,
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { age: string }]>(model, 'validated');

    expectInvalidSet(model, { age: 0 }, { age: 'Age must be greater than or equal to 1' });

    const [, error] = await event;
    assert.equals(error, { age: 'Age must be greater than or equal to 1' });
  });

  it('number lower than min is invalid', () => {
    expectInvalidSet(model, { age: 0 });
  });

  it('non numeric value is invalid', () => {
    expectInvalidSet(model, { age: '10error' });
  });

  it('number equal to min is valid', () => {
    expectValidSet(model, { age: 1 });
  });

  it('number greater than min is valid', () => {
    expectValidSet(model, { age: 2 });
  });

  it('numeric string values are treated as numbers', () => {
    expectValidSet(model, { age: '1' });
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

  describe('when min:0, 0 < val < 1', () => {
    beforeEach(() => {
      validation.aFloat = {
        min: 0,
      };
    });

    it("val is string, no leading zero, e.g. '.2'", () => {
      expectValidSet(model, { aFloat: '.2' });
    });

    it("val is string, leading zero, e.g. '0.2'", () => {
      expectValidSet(model, { aFloat: '0.2' });
    });

    it('val is number, leading zero, e.g. 0.2', () => {
      expectValidSet(model, { aFloat: 0.2 });
    });
  });
});

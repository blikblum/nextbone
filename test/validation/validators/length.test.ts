import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type PostalCodeAttributes = {
  postalCode?: number | string | null;
};

type MutableValidation = {
  postalCode: {
    length: number;
    required?: boolean;
  };
};

describe('length validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;
  let validation: MutableValidation;

  function createModelClass(currentValidation: MutableValidation) {
    return class extends withValidation(Model<PostalCodeAttributes>) {
      static validation = currentValidation as any;
    };
  }

  beforeEach(() => {
    validation = {
      postalCode: {
        length: 2,
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message for string', async () => {
    const event = waitForEvent<[typeof model, { postalCode: string }]>(model, 'validated');

    expectInvalidSet(model, { postalCode: '' }, { postalCode: 'Postal code must be 2 characters' });

    const [, error] = await event;
    assert.equals(error, { postalCode: 'Postal code must be 2 characters' });
  });

  it('string with length shorter than length is invalid', () => {
    expectInvalidSet(model, { postalCode: 'a' });
  });

  it('string with length longer than length is invalid', () => {
    expectInvalidSet(model, { postalCode: 'aaa' });
  });

  it('string with length equal to length is valid', () => {
    expectValidSet(model, { postalCode: 'aa' });
  });

  it('spaces are treated as part of the string (no trimming)', () => {
    expectInvalidSet(model, { postalCode: 'aa  ' });
  });

  it('non strings are treated as an error', () => {
    expectInvalidSet(model, { postalCode: 123 });
  });

  describe('when required is not specified', () => {
    it('undefined is invalid', () => {
      expectInvalidSet(model, { postalCode: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { postalCode: null });
    });
  });

  describe('when required:false', () => {
    beforeEach(() => {
      validation.postalCode.required = false;
    });

    it('null is valid', () => {
      expectValidSet(model, { postalCode: null });
    });

    it('undefined is valid', () => {
      expectValidSet(model, { postalCode: undefined });
    });
  });

  describe('when required:true', () => {
    beforeEach(() => {
      validation.postalCode.required = true;
    });

    it('undefined is invalid', () => {
      expectInvalidSet(model, { postalCode: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { postalCode: null });
    });
  });
});

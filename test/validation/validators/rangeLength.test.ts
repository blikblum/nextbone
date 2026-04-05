import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type NameAttributes = {
  name?: number | string | null;
};

type MutableValidation = {
  name: {
    rangeLength: [number, number];
    required?: boolean;
  };
};

describe('rangeLength validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;
  let validation: MutableValidation;

  function createModelClass(currentValidation: MutableValidation) {
    return class extends withValidation(Model<NameAttributes>) {
      static validation = currentValidation as any;
    };
  }

  beforeEach(() => {
    validation = {
      name: {
        rangeLength: [2, 4],
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message for strings', async () => {
    const event = waitForEvent<[typeof model, { name: string }]>(model, 'validated');

    expectInvalidSet(model, { name: 'a' }, { name: 'Name must be between 2 and 4 characters' });

    const [, error] = await event;
    assert.equals(error, { name: 'Name must be between 2 and 4 characters' });
  });

  it('string with length shorter than first value is invalid', () => {
    expectInvalidSet(model, { name: 'a' });
  });

  it('string with length equal to first value is valid', () => {
    expectValidSet(model, { name: 'aa' });
  });

  it('string with length longer than last value is invalid', () => {
    expectInvalidSet(model, { name: 'aaaaa' });
  });

  it('string with length equal to last value is valid', () => {
    expectValidSet(model, { name: 'aaaa' });
  });

  it('string with length within range is valid', () => {
    expectValidSet(model, { name: 'aaa' });
  });

  it('spaces are treated as part of the string (no trimming)', () => {
    expectInvalidSet(model, { name: 'aaaa ' });
  });

  it('non strings are treated as an error', () => {
    expectInvalidSet(model, { name: 123 });
  });

  describe('when required is not specified', () => {
    it('undefined is invalid', () => {
      expectInvalidSet(model, { name: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { name: null });
    });
  });

  describe('when required:false', () => {
    beforeEach(() => {
      validation.name.required = false;
    });

    it('null is valid', () => {
      expectValidSet(model, { name: null });
    });

    it('undefined is valid', () => {
      expectValidSet(model, { name: undefined });
    });
  });

  describe('when required:true', () => {
    beforeEach(() => {
      validation.name.required = true;
    });

    it('undefined is invalid', () => {
      expectInvalidSet(model, { name: undefined });
    });

    it('null is invalid', () => {
      expectInvalidSet(model, { name: null });
    });
  });
});
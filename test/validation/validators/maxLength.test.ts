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
    maxLength: number;
    required?: boolean;
  };
};

describe('maxLength validator', () => {
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
        maxLength: 2,
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel();
  });

  it('has default error message for string', async () => {
    const event = waitForEvent<[typeof model, { name: string }]>(model, 'validated');

    expectInvalidSet(model, { name: 'aaa' }, { name: 'Name must be at most 2 characters' });

    const [, error] = await event;
    assert.equals(error, { name: 'Name must be at most 2 characters' });
  });

  it('string with length longer than maxLenght is invalid', () => {
    expectInvalidSet(model, { name: 'aaa' });
  });

  it('string with length equal to maxLength is valid', () => {
    expectValidSet(model, { name: 'aa' });
  });

  it('string with length shorter than maxLength is valid', () => {
    expectValidSet(model, { name: 'a' });
  });

  it('spaces are treated as part of the string (no trimming)', () => {
    expectInvalidSet(model, { name: 'a  ' });
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

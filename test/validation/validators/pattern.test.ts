import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type PatternAttributes = {
  email?: string;
  name?: string | null;
};

type MutableValidation = {
  email: {
    pattern: string;
  };
  name: {
    pattern: RegExp;
    required?: boolean;
  };
};

describe('pattern validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;
  let validation: MutableValidation;

  function createModelClass(currentValidation: MutableValidation) {
    return class extends withValidation(Model<PatternAttributes>) {
      static validation = currentValidation as any;
    };
  }

  beforeEach(() => {
    validation = {
      name: {
        pattern: /^test/,
      },
      email: {
        pattern: 'email',
      },
    };
    const TestModel = createModelClass(validation);
    model = new TestModel({
      name: 'test',
      email: 'test@example.com',
    });
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { email: string }]>(model, 'validated');

    expectInvalidSet(model, { email: '' }, { email: 'Email must be a valid email' });

    const [, error] = await event;
    assert.equals(error, { email: 'Email must be a valid email' });
  });

  it('has default error message for inline pattern', async () => {
    const event = waitForEvent<[typeof model, { name: string }]>(model, 'validated');

    expectInvalidSet(model, { name: '' }, { name: 'Name is invalid' });

    const [, error] = await event;
    assert.equals(error, { name: 'Name is invalid' });
  });

  it('value not matching pattern is invalid', () => {
    expectInvalidSet(model, { name: 'aaa' });
  });

  it('value matching pattern is valid', () => {
    expectValidSet(model, { name: 'test' });
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

  it('can use one of the built-in patterns by specifying the name of it', () => {
    expectInvalidSet(model, { email: 'aaa' });
    expectValidSet(model, { email: 'a@example.com' });
  });
});
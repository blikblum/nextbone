import { afterEach, describe, it } from 'vitest';

import { Validation } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet } from './test-helpers.js';

describe('Extending validation with custom pattern', () => {
  const previousCustom = Validation.patterns.custom;

  afterEach(() => {
    if (previousCustom === undefined) {
      delete Validation.patterns.custom;
      return;
    }

    Validation.patterns.custom = previousCustom;
  });

  it('should execute the custom pattern validator', () => {
    Object.assign(Validation.patterns, {
      custom: /^test/,
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          pattern: 'custom',
        },
      } as any;
    }

    const model = new TestModel();

    expectValidSet(model, { name: 'test' });
    expectInvalidSet(model, { name: 'aa' });
  });
});

describe('Overriding builtin pattern in Backbone.Validation', () => {
  const builtinEmail = Validation.patterns.email;

  afterEach(() => {
    Validation.patterns.email = builtinEmail;
  });

  it('should execute the custom pattern validator', () => {
    Object.assign(Validation.patterns, {
      email: /^test/,
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          pattern: 'email',
        },
      } as any;
    }

    const model = new TestModel();

    expectValidSet(model, { name: 'test' });
    expectInvalidSet(model, { name: 'aa' });
  });
});

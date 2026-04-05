import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type AcceptanceAttributes = {
  agree?: boolean | string;
};

describe('acceptance validator', () => {
  let model: InstanceType<ReturnType<typeof createModelClass>>;

  function createModelClass() {
    return class extends withValidation(Model<AcceptanceAttributes>) {
      static validation = {
        agree: {
          acceptance: true,
        },
      };
    };
  }

  beforeEach(() => {
    const TestModel = createModelClass();
    model = new TestModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { agree: string }]>(model, 'validated');

    expectInvalidSet(model, { agree: false }, { agree: 'Agree must be accepted' });

    const [, error] = await event;
    assert.equals(error, { agree: 'Agree must be accepted' });
  });

  it('non-boolean is invalid', () => {
    expectInvalidSet(model, { agree: 'non-boolean' });
  });

  it('string with true is evaluated as valid', () => {
    expectValidSet(model, { agree: 'true' });
  });

  it('false boolean is invalid', () => {
    expectInvalidSet(model, { agree: false });
  });

  it('true boolean is valid', () => {
    expectValidSet(model, { agree: true });
  });
});
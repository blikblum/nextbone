import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type PasswordAttributes = {
  password?: string;
  passwordRepeat?: string;
};

const createModel = () => {
  class TestModel extends withValidation(Model<PasswordAttributes>) {
    static validation = {
      password: {
        required: true,
      },
      passwordRepeat: {
        equalTo: 'password',
      },
    };
  }

  const model = new TestModel();
  model.set({ password: 'password' });
  return model;
};

describe('equalTo validator', () => {
  let model: ReturnType<typeof createModel>;

  beforeEach(() => {
    model = createModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { passwordRepeat: string }]>(model, 'validated');

    expectInvalidSet(
      model,
      { passwordRepeat: '123' },
      {
        passwordRepeat: 'Password repeat must be the same as Password',
      },
    );

    const [, error] = await event;
    assert.equals(error, { passwordRepeat: 'Password repeat must be the same as Password' });
  });

  it('value equal to (===) the specified attribute is valid', () => {
    expectValidSet(model, { passwordRepeat: 'password' });
  });

  it('value not equal to (!==) the specified attribute is invalid', () => {
    expectInvalidSet(model, { passwordRepeat: 'error' });
  });

  it('is case sensitive', () => {
    expectInvalidSet(model, { passwordRepeat: 'Password' });
  });

  it('setting both at the same time to the same value is valid', () => {
    expectValidSet(model, { password: 'a', passwordRepeat: 'a' });
  });
});

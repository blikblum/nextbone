import { beforeEach, describe, it } from 'vitest';

import { assert, sinon } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

describe('Specifying error messages', () => {
  let invalid: any;

  beforeEach(() => {
    invalid = sinon.spy();
  });

  describe('per validator', () => {
    const createModel = () => {
      class TestModel extends withValidation(Model<{ email?: string }>) {
        static validation = {
          email: [
            {
              required: true,
              msg: 'required',
            },
            {
              pattern: 'email',
              msg: () => 'pattern',
            },
          ],
        } as any;
      }

      return new TestModel();
    };

    it('and violating first validator returns msg specified for first validator', () => {
      const model = createModel();

      model.set({ email: '' }, { validate: true, invalid } as any);

      assert(invalid.calledWith('email', 'required'));
    });

    it('and violating second validator returns msg specified for second validator', () => {
      const model = createModel();

      model.set({ email: 'a' }, { validate: true, invalid } as any);

      assert(invalid.calledWith('email', 'pattern'));
    });
  });

  describe('per attribute', () => {
    const createModel = () => {
      class TestModel extends withValidation(Model<{ email?: string }>) {
        static validation = {
          email: {
            required: true,
            pattern: 'email',
            msg: 'error',
          },
        } as any;
      }

      return new TestModel();
    };

    it('and violating first validator returns msg specified for attribute', () => {
      const model = createModel();

      model.set({ email: '' }, { validate: true, invalid } as any);

      assert(invalid.calledWith('email', 'error'));
    });

    it('and violating second validator returns msg specified for attribute', () => {
      const model = createModel();

      model.set({ email: 'a' }, { validate: true, invalid } as any);

      assert(invalid.calledWith('email', 'error'));
    });
  });
});

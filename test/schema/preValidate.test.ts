import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type TestAttributes = {
  email?: string;
  name?: string;
};

describe('preValidate', () => {
  describe('when model has defined schema', () => {
    class ValidatedModel extends withSchema(Model<TestAttributes>) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
      });
    }

    let model: ValidatedModel;

    beforeEach(() => {
      model = new ValidatedModel();
    });

    it('returns nothing when single attribute is valid', () => {
      assert.isNotOk(model.preValidate('name', 'valid name'));
    });

    it('returns error message when single attribute is invalid', () => {
      assert.isDefined(model.preValidate('name', ''));
    });

    it('returns undefined when multiple attributes are valid', () => {
      assert.isUndefined(
        model.preValidate({
          name: 'valid name',
          email: 'test@example.com',
        }),
      );
    });

    it('returns errors when multiple attributes are invalid', () => {
      const errors = model.preValidate({
        name: '',
        email: 'invalid',
      }) as Partial<Record<keyof TestAttributes, string>>;

      assert.isDefined(errors);
      assert.isDefined(errors.name);
      assert.isDefined(errors.email);
    });

    it('returns error only for invalid attributes', () => {
      const errors = model.preValidate({
        name: '',
        email: 'test@example.com',
      }) as Partial<Record<keyof TestAttributes, string>>;

      assert.isDefined(errors);
      assert.isDefined(errors.name);
      assert.isUndefined(errors.email);
    });

    it('does not update the model', () => {
      model.set({ name: 'initial' });
      model.preValidate('name', 'changed');

      assert.strictEqual(model.get('name'), 'initial');
    });

    it('does not update the model for multiple attributes', () => {
      model.set({ name: 'initial', email: 'initial@example.com' });
      model.preValidate({
        name: 'changed',
        email: 'changed@example.com',
      });

      assert.strictEqual(model.get('name'), 'initial');
      assert.strictEqual(model.get('email'), 'initial@example.com');
    });
  });

  describe('when model has no schema', () => {
    class SchemaLessModel extends withSchema(Model) {}

    let model: SchemaLessModel;

    beforeEach(() => {
      model = new SchemaLessModel();
    });

    it('returns undefined', () => {
      assert.isUndefined(model.preValidate('anyField', 'anyValue'));
    });
  });

  describe('with attribute not in schema', () => {
    class SingleFieldModel extends withSchema(Model<TestAttributes>) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
      });
    }

    let model: SingleFieldModel;

    beforeEach(() => {
      model = new SingleFieldModel();
    });

    it('returns empty string for attribute not in schema', () => {
      const result = model.preValidate('unknownField', 'value');

      assert.strictEqual(result, '');
    });
  });
});

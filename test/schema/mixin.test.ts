import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type MixInAttributes = {
  baseField?: string;
  extendedField?: string;
  name?: string;
};

describe('withSchema as mixin', () => {
  describe('can be used as a function', () => {
    class BaseModel extends Model<MixInAttributes> {
      customMethod() {
        return 'custom';
      }
    }

    class ExtendedModel extends withSchema(BaseModel) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
      });
    }

    let model: ExtendedModel;

    beforeEach(() => {
      model = new ExtendedModel();
    });

    it('preserves parent class methods', () => {
      assert.strictEqual(model.customMethod(), 'custom');
    });

    it('adds validation methods', () => {
      assert.strictEqual(typeof model.preValidate, 'function');
      assert.strictEqual(typeof model.isValid, 'function');
      assert.strictEqual(typeof model.validate, 'function');
    });

    it('validates using schema', () => {
      model.set({ name: '' }, { validate: true });
      assert.isDefined(model.validationError);

      model.set({ name: 'test' }, { validate: true });
      assert.isNull(model.validationError);
    });
  });

  describe('can be used multiple times on inheritance chain', () => {
    class BaseSchemaModel extends withSchema(Model<MixInAttributes>) {
      static schema = z.object({
        baseField: z.string().min(1, 'Base field is required'),
      });
    }

    class ExtendedSchemaModel extends withSchema(BaseSchemaModel) {
      static schema = z.object({
        baseField: z.string().min(1, 'Base field is required'),
        extendedField: z.string().min(1, 'Extended field is required'),
      });
    }

    let baseModel: BaseSchemaModel;
    let extendedModel: ExtendedSchemaModel;

    beforeEach(() => {
      baseModel = new BaseSchemaModel();
      extendedModel = new ExtendedSchemaModel();
    });

    it('base model uses base schema', () => {
      baseModel.set({ baseField: 'value' });
      assert.isTrue(baseModel.isValid());
    });

    it('extended model uses extended schema', () => {
      extendedModel.set({ baseField: 'value', extendedField: '' });
      assert.isFalse(extendedModel.isValid());

      extendedModel.set({ baseField: 'value', extendedField: 'value' });
      assert.isTrue(extendedModel.isValid());
    });
  });

  describe('schema is cached per class', () => {
    class CachedSchemaModel extends withSchema(Model<MixInAttributes>) {
      static schema = z.object({
        name: z.string().min(1),
      });
    }

    let model1: CachedSchemaModel;
    let model2: CachedSchemaModel;

    beforeEach(() => {
      model1 = new CachedSchemaModel();
      model2 = new CachedSchemaModel();
    });

    it('multiple instances share the same schema', () => {
      model1.set({ name: 'test1' });
      model2.set({ name: 'test2' });

      assert.isTrue(model1.isValid());
      assert.isTrue(model2.isValid());
    });
  });
});

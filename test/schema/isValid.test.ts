import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type TestAttributes = {
  age?: number | string;
  name?: string;
  phone?: string;
};

describe('isValid', () => {
  describe('when model has not defined any schema', () => {
    let model: Model;

    beforeEach(() => {
      model = new Model();
    });

    it('returns true', () => {
      assert.isTrue(model.isValid());
    });
  });

  describe('when model has defined schema', () => {
    class BasicModel extends withSchema(Model<TestAttributes>) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
      });
    }

    let model: BasicModel;

    beforeEach(() => {
      model = new BasicModel();
    });

    it('returns true when model is valid', () => {
      model.set({ name: 'name' });

      assert.isTrue(model.isValid());
    });

    it('returns false when model is invalid', () => {
      assert.isFalse(model.isValid());

      model.set({ name: '' });

      assert.isFalse(model.isValid());
    });

    it('set validationError when model is invalid', () => {
      model.set({ name: '' });

      model.isValid();

      assert.isDefined(model.validationError);
      assert.isDefined(model.validationError?.name);
    });

    it('invalid is triggered when model is invalid', async () => {
      await new Promise<void>((resolve) => {
        model.on('invalid', () => {
          resolve();
        });

        assert.isFalse(model.isValid());
      });
    });

    describe('and passing name of attribute', () => {
      class AttributeModel extends withSchema(Model<TestAttributes>) {
        static schema = z.object({
          name: z.string().min(1, 'Name is required'),
          age: z.number({ message: 'Age is required' }),
        });
      }

      let attributeModel: AttributeModel;

      beforeEach(() => {
        attributeModel = new AttributeModel();
      });

      it('returns false when attribute is invalid', () => {
        assert.isFalse(attributeModel.isValid('name'));
      });

      it('invalid is triggered when attribute is invalid', async () => {
        await new Promise<void>((resolve) => {
          attributeModel.on('invalid', () => {
            resolve();
          });

          assert.isFalse(attributeModel.isValid('name'));
        });
      });

      it('returns true when attribute is valid', () => {
        attributeModel.set({ name: 'name' });

        assert.isTrue(attributeModel.isValid('name'));
      });
    });

    describe('and passing array of attributes', () => {
      class MultiAttributeModel extends withSchema(Model<TestAttributes>) {
        static schema = z.object({
          name: z.string().min(1, 'Name is required'),
          age: z.number({ message: 'Age is required' }),
          phone: z.string().min(1, 'Phone is required'),
        });
      }

      let multiAttributeModel: MultiAttributeModel;

      beforeEach(() => {
        multiAttributeModel = new MultiAttributeModel();
      });

      it('returns false when all attributes are invalid', () => {
        assert.isFalse(multiAttributeModel.isValid(['name', 'age']));
      });

      it('returns false when one attribute is invalid', () => {
        multiAttributeModel.set({ name: 'name' });

        assert.isFalse(multiAttributeModel.isValid(['name', 'age']));
      });

      it('returns true when all attributes are valid', () => {
        multiAttributeModel.set({ name: 'name', age: 1 });

        assert.isTrue(multiAttributeModel.isValid(['name', 'age']));
      });
    });
  });
});

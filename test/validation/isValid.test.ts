import { beforeEach, describe, it } from 'vitest';

import { assert, refute } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { waitForEvent } from './test-helpers.js';

describe('isValid', () => {
  describe('when model has not defined any validation', () => {
    let model: Model;

    beforeEach(() => {
      model = new Model();
    });

    it('returns true', () => {
      assert.equals(model.isValid(), true);
    });
  });

  describe('when model has defined validation', () => {
    class RequiredNameModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          required: true,
        },
      };
    }

    let model: RequiredNameModel;

    beforeEach(() => {
      model = new RequiredNameModel();
    });

    it('returns true when model is valid', () => {
      model.set({ name: 'name' });

      assert.equals(model.isValid(), true);
    });

    it('returns false when model is invalid', () => {
      assert.equals(model.isValid(), false);

      model.set({ name: '' });

      assert.equals(model.isValid(), false);
    });

    it('set validationError when model is invalid', () => {
      model.set({ name: '' });

      model.isValid();

      assert(model.validationError);
      assert(model.validationError.name);
    });

    it('invalid is triggered when model is invalid', async () => {
      const event = waitForEvent<[typeof model, { name: string }]>(model, 'invalid');

      refute(model.isValid());

      const [invalidModel, attrs] = await event;
      assert.same(invalidModel, model);
      assert.equals(attrs, { name: 'Name is required' });
    });

    describe('and passing name of attribute', () => {
      class RequiredNameAndAgeModel extends withValidation(Model<{ age?: number; name?: string }>) {
        static validation = {
          name: {
            required: true,
          },
          age: {
            required: true,
          },
        };
      }

      let attributeModel: RequiredNameAndAgeModel;

      beforeEach(() => {
        attributeModel = new RequiredNameAndAgeModel();
      });

      it('returns false when attribute is invalid', () => {
        refute(attributeModel.isValid('name'));
      });

      it('invalid is triggered when attribute is invalid', async () => {
        const event = waitForEvent<[typeof attributeModel, { name: string }]>(
          attributeModel,
          'invalid',
        );

        refute(attributeModel.isValid('name'));

        const [invalidModel, attrs] = await event;
        assert.same(invalidModel, attributeModel);
        assert.equals(attrs, { name: 'Name is required' });
      });

      it('returns true when attribute is valid', () => {
        attributeModel.set({ name: 'name' });

        assert.equals(attributeModel.isValid('name'), true);
      });
    });

    describe('and passing array of attributes', () => {
      class RequiredThreeFieldsModel extends withValidation(
        Model<{ age?: number; name?: string; phone?: string }>,
      ) {
        static validation = {
          name: {
            required: true,
          },
          age: {
            required: true,
          },
          phone: {
            required: true,
          },
        };
      }

      let arrayModel: RequiredThreeFieldsModel;

      beforeEach(() => {
        arrayModel = new RequiredThreeFieldsModel();
      });

      it('returns false when all attributes are invalid', () => {
        refute(arrayModel.isValid(['name', 'age']));
      });

      it('returns false when one attribute is invalid', () => {
        arrayModel.set({ name: 'name' });

        refute(arrayModel.isValid(['name', 'age']));
      });

      it('returns true when all attributes are valid', () => {
        arrayModel.set({ name: 'name', age: 1 });

        assert.equals(arrayModel.isValid(['name', 'age']), true);
      });
    });
  });
});
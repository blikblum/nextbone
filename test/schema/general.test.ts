import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type GeneralAttributes = {
  age?: number | string;
  name?: string;
  person?: {
    age?: number | string;
    name?: string;
  };
  postalCode?: string;
  someProp?: string;
  someProperty?: boolean;
};

class TestModel extends withSchema(Model<GeneralAttributes>) {
  static schema = z.object({
    age: z.number({ message: 'Age is invalid' }),
    name: z.string().min(1, 'Name is invalid'),
  });
}

describe('withSchema', () => {
  let model: TestModel;

  beforeEach(() => {
    model = new TestModel();
  });

  describe('when bound to model with two validated attributes', () => {
    it('attribute without validator should be set successfully', () => {
      model.set(
        {
          someProperty: true,
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.strictEqual(model.get('someProperty'), true);
    });

    describe('and setting', () => {
      describe('one valid value', () => {
        beforeEach(() => {
          model.set(
            {
              age: 1,
            },
            { validate: true },
          );
        });

        it('clears validationError for the validated attribute', () => {
          assert.isNull(model.validationError);
        });

        it('should update the model', () => {
          assert.strictEqual(model.get('age'), 1);
        });

        it('model should be invalid', () => {
          assert.isFalse(model.isValid());
        });
      });

      describe('one invalid value', () => {
        beforeEach(() => {
          model.set(
            {
              age: 'not a number',
            },
            { validate: true },
          );
        });

        it('sets validationError', () => {
          assert.isDefined(model.validationError);
          assert.property(model.validationError, 'age');
        });

        it('should update the model', () => {
          assert.strictEqual(model.get('age'), 'not a number');
        });

        it('model should be invalid', () => {
          assert.isFalse(model.isValid());
        });
      });

      describe('two valid values', () => {
        beforeEach(() => {
          model.set(
            {
              age: 1,
              name: 'hello',
            },
            { validate: true },
          );
        });

        it('model should be valid', () => {
          assert.isNull(model.validationError);
          assert.isTrue(model.isValid());
        });
      });

      describe('two invalid values', () => {
        beforeEach(() => {
          model.set(
            {
              age: 'not a number',
              name: '',
            },
            { validate: true },
          );
        });

        it('model should be invalid', () => {
          assert.isDefined(model.validationError);
          assert.isFalse(model.isValid());
        });
      });

      describe('first value invalid and second value valid', () => {
        beforeEach(() => {
          model.set(
            {
              age: 1,
              name: '',
            },
            { validate: true },
          );
        });

        it('validationError is set', () => {
          assert.isDefined(model.validationError);
          assert.property(model.validationError, 'name');
        });

        it('model should be invalid', () => {
          assert.isFalse(model.isValid());
        });
      });

      describe('first value valid and second value invalid', () => {
        beforeEach(() => {
          model.set(
            {
              age: 'not a number',
              name: 'name',
            },
            { validate: true },
          );
        });

        it('validationError is set', () => {
          assert.isDefined(model.validationError);
          assert.property(model.validationError, 'age');
        });

        it('model should be invalid', () => {
          assert.isFalse(model.isValid());
        });
      });

      it('one value at a time correctly marks the model as either valid or invalid', () => {
        assert.isFalse(model.isValid());

        model.set(
          {
            age: 'not a number',
          },
          { validate: true },
        );
        assert.isDefined(model.validationError);
        assert.isFalse(model.isValid());

        model.set(
          {
            age: 1,
          },
          { validate: true },
        );
        assert.isNull(model.validationError);
        assert.isFalse(model.isValid());

        model.set(
          {
            name: 'hello',
          },
          { validate: true },
        );
        assert.isNull(model.validationError);
        assert.isTrue(model.isValid());

        model.set(
          {
            age: 'not a number',
          },
          { validate: true },
        );
        assert.isDefined(model.validationError);
        assert.isFalse(model.isValid());
      });
    });

    describe('and validate is explicitly called with no parameters', () => {
      class ExplicitValidationModel extends withSchema(Model<GeneralAttributes>) {
        static schema = z.object({
          age: z.number('error').min(1, 'error'),
          name: z.string('error').min(1, 'error'),
        });
      }

      let explicitValidationModel: ExplicitValidationModel;
      let invalid: ReturnType<typeof vi.fn>;
      let valid: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        invalid = vi.fn();
        valid = vi.fn();
        explicitValidationModel = new ExplicitValidationModel();
      });

      const getCalledAttributes = (callback: ReturnType<typeof vi.fn>) => {
        return callback.mock.calls.map(([attribute]) => attribute);
      };

      it('all attributes on the model is validated when nothing has been set', () => {
        explicitValidationModel.validate(undefined, {
          valid,
          invalid,
        });

        expect(getCalledAttributes(invalid)).toEqual(['age', 'name']);
        expect(invalid).toHaveBeenCalledWith('age', 'error', expect.any(Object));
        expect(invalid).toHaveBeenCalledWith('name', 'error', expect.any(Object));
        expect(valid).not.toHaveBeenCalled();
      });

      it('all attributes on the model is validated when one property has been set without validating', () => {
        explicitValidationModel.set({ age: 1 });

        explicitValidationModel.validate(undefined, {
          valid,
          invalid,
        });

        expect(getCalledAttributes(valid)).toEqual(['age']);
        expect(getCalledAttributes(invalid)).toEqual(['name']);
        expect(valid).toHaveBeenCalledWith('age', expect.any(Object));
        expect(invalid).toHaveBeenCalledWith('name', 'error', expect.any(Object));
      });

      it('all attributes on the model is validated when two properties has been set without validating', () => {
        explicitValidationModel.set({ age: 1, name: 'name' });

        explicitValidationModel.validate(undefined, {
          valid,
          invalid,
        });

        expect(getCalledAttributes(valid)).toEqual(['age', 'name']);
        expect(valid).toHaveBeenCalledWith('age', expect.any(Object));
        expect(valid).toHaveBeenCalledWith('name', expect.any(Object));
      });

      it('callbacks are not called for unvalidated attributes', () => {
        explicitValidationModel.set({ age: 1, name: 'name', someProp: 'some value' });

        explicitValidationModel.validate(undefined, {
          valid,
          invalid,
        });

        expect(getCalledAttributes(valid)).toEqual(['age', 'name']);
        expect(getCalledAttributes(valid)).not.toContain('someProp');

        expect(valid).toHaveBeenCalledWith('age', expect.any(Object));
      });
    });
  });

  describe('when bound to model with three validators on one attribute', () => {
    class PostalCodeModel extends withSchema(Model<GeneralAttributes>) {
      static schema = z.object({
        postalCode: z
          .string()
          .regex(/^\d+$/, 'Must be digits')
          .min(2, 'Too short')
          .max(4, 'Too long'),
      });
    }

    let postalCodeModel: PostalCodeModel;

    beforeEach(() => {
      postalCodeModel = new PostalCodeModel();
    });

    it('and violating the first validator (too short) the model is invalid', () => {
      postalCodeModel.set({ postalCode: '1' }, { validate: true });

      assert.isDefined(postalCodeModel.validationError);
      assert.isFalse(postalCodeModel.isValid());
    });

    it('and violating the pattern validator the model is invalid', () => {
      postalCodeModel.set({ postalCode: 'ab' }, { validate: true });

      assert.isDefined(postalCodeModel.validationError);
      assert.isFalse(postalCodeModel.isValid());
    });

    it('and violating the max length validator the model is invalid', () => {
      postalCodeModel.set({ postalCode: '12345' }, { validate: true });

      assert.isDefined(postalCodeModel.validationError);
      assert.isFalse(postalCodeModel.isValid());
    });

    it('and conforming to all validators the model is valid', () => {
      postalCodeModel.set({ postalCode: '123' }, { validate: true });

      assert.isNull(postalCodeModel.validationError);
      assert.isTrue(postalCodeModel.isValid());
    });
  });

  describe('when bound to model with custom toJSON', () => {
    beforeEach(() => {
      model.toJSON = function () {
        return {
          person: {
            age: this.attributes.age,
            name: this.attributes.name,
          },
        };
      };
    });

    it('and conforming to all validators the model is valid', () => {
      model.set({ age: 12 }, { validate: true });
      assert.isNull(model.validationError);

      model.set({ name: 'Jack' }, { validate: true });
      assert.isNull(model.validationError);

      model.validate(undefined);
      assert.isTrue(model.isValid());
    });
  });

  describe('when bound to model without schema', () => {
    class SchemaLessModel extends withSchema(Model<GeneralAttributes>) {}

    let schemaLessModel: SchemaLessModel;

    beforeEach(() => {
      schemaLessModel = new SchemaLessModel();
    });

    it('isValid', () => {
      assert.isTrue(schemaLessModel.isValid());
    });

    it('validate', () => {
      assert.isNotOk(schemaLessModel.validate(undefined));
    });

    it('preValidate', () => {
      assert.isNotOk(schemaLessModel.preValidate('name', 'value'));
    });
  });
});

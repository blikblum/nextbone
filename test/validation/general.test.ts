import { beforeEach, describe, it } from 'vitest';

import { assert, refute, sinon } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

describe('Validation', () => {
  class BasicValidationModel extends withValidation(
    Model<{ age?: number; name?: string; someProperty?: boolean }>,
  ) {
    static validation = {
      age: (value?: number) => {
        if (!value) {
          return 'Age is invalid';
        }
      },
      name: (value?: string) => {
        if (!value) {
          return 'Name is invalid';
        }
      },
    } as any;
  }

  let model: BasicValidationModel;

  beforeEach(() => {
    model = new BasicValidationModel();
  });

  describe('when bound to model with two validated attributes', () => {
    it('attribute without validator should be set sucessfully', () => {
      model.set(
        {
          someProperty: true,
        },
        { validate: true },
      );

      assert.same(model.validationError, null);
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

        it('should not leave a validation error from the set call', () => {
          assert.same(model.validationError, null);
        });

        it('should update the model', () => {
          assert.equals(model.get('age'), 1);
        });

        it('model should be invalid', () => {
          refute(model.isValid());
        });
      });

      describe('one invalid value', () => {
        beforeEach(() => {
          model.set(
            {
              age: 0,
            },
            { validate: true },
          );
        });

        it('records a validation error', () => {
          assert.equals(model.validationError, {
            age: 'Age is invalid',
            name: 'Name is invalid',
          });
        });

        it('should update the model', () => {
          assert.equals(model.get('age'), 0);
        });

        it('model should be invalid', () => {
          refute(model.isValid());
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
          assert.same(model.validationError, null);
          assert(model.isValid());
        });
      });

      describe('two invalid values', () => {
        beforeEach(() => {
          model.set(
            {
              age: 0,
              name: '',
            },
            { validate: true },
          );
        });

        it('model should be invalid', () => {
          assert.equals(model.validationError, {
            age: 'Age is invalid',
            name: 'Name is invalid',
          });
          refute(model.isValid());
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

        it('records the validation error', () => {
          assert.equals(model.validationError, { name: 'Name is invalid' });
        });

        it('model should be invalid', () => {
          refute(model.isValid());
        });
      });

      describe('first value valid and second value invalid', () => {
        beforeEach(() => {
          model.set(
            {
              age: 0,
              name: 'name',
            },
            { validate: true },
          );
        });

        it('records the validation error', () => {
          assert.equals(model.validationError, { age: 'Age is invalid' });
        });

        it('model should be invalid', () => {
          refute(model.isValid());
        });
      });

      it('one value at a time correctly marks the model as either valid or invalid', () => {
        refute(model.isValid());

        model.set(
          {
            age: 0,
          },
          { validate: true },
        );
        refute(model.isValid());

        model.set(
          {
            age: 1,
          },
          { validate: true },
        );
        refute(model.isValid());

        model.set(
          {
            name: 'hello',
          },
          { validate: true },
        );
        assert(model.isValid());

        model.set(
          {
            age: 0,
          },
          { validate: true },
        );
        refute(model.isValid());
      });
    });

    describe('and validate is explicitly called with no parameters', () => {
      class ExplicitValidateModel extends withValidation(Model<{ age?: number; name?: string }>) {
        static validation = {
          age: {
            min: 1,
            msg: 'error',
          },
          name: {
            required: true,
            msg: 'error',
          },
        };
      }

      let explicitModel: ExplicitValidateModel;
      let invalid: any;
      let valid: any;

      beforeEach(() => {
        invalid = sinon.spy();
        valid = sinon.spy();
        explicitModel = new ExplicitValidateModel();
      });

      it('all attributes on the model is validated when nothing has been set', () => {
        explicitModel.validate(undefined, {
          valid,
          invalid,
        });

        assert.calledWith(invalid, 'age', 'error');
        assert.calledWith(invalid, 'name', 'error');
      });

      it('all attributes on the model is validated when one property has been set without validating', () => {
        explicitModel.set({ age: 1 });

        explicitModel.validate(undefined, {
          valid,
          invalid,
        });

        assert.calledWith(valid, 'age');
        assert.calledWith(invalid, 'name', 'error');
      });

      it('all attributes on the model is validated when two properties has been set without validating', () => {
        explicitModel.set({ age: 1, name: 'name' });

        explicitModel.validate(undefined, {
          valid,
          invalid,
        });

        assert.calledWith(valid, 'age');
        assert.calledWith(valid, 'name');
      });

      it('callbacks are not called for unvalidated attributes', () => {
        explicitModel.set({ age: 1, name: 'name', someProp: 'some value' } as any);

        explicitModel.validate(undefined, {
          valid,
          invalid,
        });

        assert.calledWith(valid, 'age');
        assert.calledWith(valid, 'name');
        refute.calledWith(valid, 'someProp');
      });
    });
  });

  describe('when bound to model with three validators on one attribute', () => {
    class PostalCodeModel extends withValidation(Model<{ postalCode?: string }>) {
      static validation = {
        postalCode: {
          minLength: 2,
          pattern: 'digits',
          maxLength: 4,
        },
      };
    }

    let postalCodeModel: PostalCodeModel;

    beforeEach(() => {
      postalCodeModel = new PostalCodeModel();
    });

    it('and violating the first validator the model is invalid', () => {
      postalCodeModel.set({ postalCode: '1' }, { validate: true });

      refute(postalCodeModel.isValid());
    });

    it('and violating the second validator the model is invalid', () => {
      postalCodeModel.set({ postalCode: 'ab' }, { validate: true });

      refute(postalCodeModel.isValid());
    });

    it('and violating the last validator the model is invalid', () => {
      postalCodeModel.set({ postalCode: '12345' }, { validate: true });

      refute(postalCodeModel.isValid());
    });

    it('and conforming to all validators the model is valid', () => {
      postalCodeModel.set({ postalCode: '123' }, { validate: true });

      assert(postalCodeModel.isValid());
    });
  });

  describe('when bound to model with two dependent attribute validations', () => {
    class DependentValidationModel extends withValidation(Model<{ one?: number; two?: number }>) {
      static validation = {
        one: (value: number, _attr: string, computed: { two?: number }) => {
          if (value < (computed.two as number)) {
            return 'error';
          }
        },
        two: (value: number, _attr: string, computed: { one?: number }) => {
          if (value > (computed.one as number)) {
            return 'error';
          }
        },
      } as any;
    }

    let dependentModel: DependentValidationModel;
    let invalid: any;
    let valid: any;

    beforeEach(() => {
      dependentModel = new DependentValidationModel();
      valid = sinon.spy();
      invalid = sinon.spy();
    });

    describe('when setting invalid value on second input', () => {
      beforeEach(() => {
        dependentModel.set({ one: 1 }, { validate: true, valid, invalid } as any);
        dependentModel.set({ two: 2 }, { validate: true, valid, invalid } as any);
      });

      it('first input is valid', () => {
        assert.calledWith(invalid, 'one', 'error');
      });

      it('second input is invalid', () => {
        assert.calledWith(invalid, 'two', 'error');
      });
    });

    describe('when setting invalid value on second input and changing first', () => {
      beforeEach(() => {
        dependentModel.set({ one: 1 }, { validate: true, valid, invalid } as any);
        dependentModel.set({ two: 2 }, { validate: true, valid, invalid } as any);
        dependentModel.set({ one: 2 }, { validate: true, valid, invalid } as any);
      });

      it('first input is valid', () => {
        assert.calledWith(valid, 'one');
      });

      it('second input is valid', () => {
        assert.calledWith(valid, 'two');
      });
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
      model.set({ name: 'Jack' }, { validate: true });

      model.validate();
      assert(model.isValid());
    });
  });

  describe('when bound to model without validation rules', () => {
    class NoValidationRulesModel extends withValidation(Model) {}

    let noValidationModel: NoValidationRulesModel;

    beforeEach(() => {
      noValidationModel = new NoValidationRulesModel();
    });

    it('isValid', () => {
      assert(noValidationModel.isValid());
    });

    it('validate', () => {
      refute(noValidationModel.validate());
    });

    it('preValidate', () => {
      refute((noValidationModel.preValidate as any)());
    });
  });
});

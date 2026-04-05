/* eslint-disable camelcase */
import { beforeEach, describe, it } from 'vitest';

import { assert } from 'chai';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

type ValidationErrors<T extends string> = Partial<Record<T, string>>;

class NoValidationModel extends withValidation(Model) {
  static validation = {};
}

type ValidatedAttributes = {
  address?: string;
  age?: number;
  authenticated?: boolean | null;
  name?: string;
};

class ValidatedModel extends withValidation(Model<ValidatedAttributes>) {
  static validation = {
    name: {
      required: true,
    },
    address: {
      required: true,
    },
    authenticated: {
      required: false,
    },
  };
}

const CARD_TYPES = {
  VISA: 0,
  AMEX: 1,
} as const;

type CardType = (typeof CARD_TYPES)[keyof typeof CARD_TYPES];

type PaymentAttributes = {
  card_type?: CardType | '';
  security_code?: string;
};

class PaymentModel extends withValidation(Model<PaymentAttributes>) {
  static CARD_TYPES = CARD_TYPES;

  static validation = {
    card_type: {
      required: true,
    },
    security_code: (
      value: PaymentAttributes['security_code'],
      _attr: string,
      computedState: PaymentAttributes,
    ) => {
      const requiredLength = computedState.card_type === CARD_TYPES.AMEX ? 4 : 3;

      if (value && typeof value === 'string' && value.length !== requiredLength) {
        return 'Please enter a valid security code.';
      }
    },
  } as any;
}

describe('preValidate', () => {
  describe('when model has not defined any validation', () => {
    let model: NoValidationModel;

    beforeEach(() => {
      model = new NoValidationModel();
    });

    it('returns nothing', () => {
      assert.isNotOk(model.preValidate('attr', 'value'));
    });

    it('keeps validationError null after set call', () => {
      model.set({ attr: 'value' }, { validate: true });

      assert.isNull(model.validationError);
    });
  });

  describe('when model has defined validation', () => {
    let model: ValidatedModel;

    beforeEach(() => {
      model = new ValidatedModel();
    });

    it('sets validationError after an invalid set call', () => {
      model.set({ name: '' }, { validate: true });

      const errors = model.validationError as ValidationErrors<keyof ValidatedAttributes>;

      assert.isDefined(errors.name);
    });

    it('clears validationError after a valid set call', () => {
      model.set({ name: '' }, { validate: true });
      model.set({ name: 'name', address: 'address' }, { validate: true });

      assert.isNull(model.validationError);
    });

    describe('and pre-validating single attribute', () => {
      it('returns error message when value is not valid', () => {
        assert.isOk(model.preValidate('name', ''));
      });

      it('returns nothing when value is valid', () => {
        assert.isNotOk(model.preValidate('name', 'name'));
      });

      it('returns nothing when attribute pre-validated has no validation', () => {
        assert.isNotOk(model.preValidate('age', 2));
      });

      it('handles null value', () => {
        assert.isNotOk(model.preValidate('authenticated', null));
      });
    });

    describe('and pre-validating a hash of attributes', () => {
      it('returns error object when value is not valid', () => {
        const result = model.preValidate({
          name: '',
          address: 'address',
        }) as ValidationErrors<keyof ValidatedAttributes>;

        assert.isDefined(result.name);
        assert.isUndefined(result.address);
      });

      it('returns error object when values are not valid', () => {
        const result = model.preValidate({
          name: '',
          address: '',
        }) as ValidationErrors<keyof ValidatedAttributes>;

        assert.isDefined(result.name);
        assert.isDefined(result.address);
      });

      it('returns nothing when value is valid', () => {
        assert.isNotOk(model.preValidate({ name: 'name' }));
      });
    });
  });

  describe('when model has dependencies between validation functions', () => {
    let model: PaymentModel;

    beforeEach(() => {
      model = new PaymentModel();
    });

    it('sets validationError after an invalid dependent set call', () => {
      model.set(
        {
          card_type: PaymentModel.CARD_TYPES.VISA,
          security_code: '1234',
        },
        { validate: true },
      );

      const errors = model.validationError as ValidationErrors<keyof PaymentAttributes>;

      assert.isDefined(errors.security_code);
      assert.isUndefined(errors.card_type);
    });

    describe('and pre-validating a hash of attributes', () => {
      it('returns error object when value is not valid', () => {
        const result = model.preValidate({
          card_type: PaymentModel.CARD_TYPES.VISA,
          security_code: '1234',
        }) as ValidationErrors<keyof PaymentAttributes>;

        assert.isDefined(result.security_code);
        assert.isUndefined(result.card_type);
      });

      it('returns error object when values are not valid', () => {
        const result = model.preValidate({
          card_type: '',
          security_code: '12345',
        }) as ValidationErrors<keyof PaymentAttributes>;

        assert.isDefined(result.card_type);
        assert.isDefined(result.security_code);
      });

      it('returns nothing when value is valid', () => {
        assert.isNotOk(
          model.preValidate({
            card_type: PaymentModel.CARD_TYPES.AMEX,
            security_code: '1234',
          }),
        );
      });
    });
  });
});

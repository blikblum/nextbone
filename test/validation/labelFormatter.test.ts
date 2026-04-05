/* eslint-disable camelcase */
import { afterEach, beforeEach, describe, it } from 'vitest';

import { Validation, assert } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

type LabelAttributes = {
  someAttribute?: string;
  some_attribute?: string;
  some_other_attribute?: string;
};

class LabelModel extends withValidation(Model<LabelAttributes>) {
  static validation = {
    someAttribute: {
      required: true,
    },
    some_attribute: {
      required: true,
    },
    some_other_attribute: {
      required: true,
    },
  };

  labels = {
    someAttribute: 'Custom label',
  };
}

describe('Label formatters', () => {
  let model: LabelModel;

  beforeEach(() => {
    model = new LabelModel();
  });

  afterEach(() => {
    Validation.options.labelFormatter = 'sentenceCase';
  });

  describe('Attribute names on the model can be formatted in error messages using', () => {
    describe('no formatting', () => {
      beforeEach(() => {
        Validation.options.labelFormatter = 'none';
      });

      it('returns the attribute name', () => {
        assert.equals('someAttribute is required', model.preValidate('someAttribute', ''));
      });
    });

    describe('label formatting', () => {
      beforeEach(() => {
        Validation.options.labelFormatter = 'label';
      });

      it('looks up a label on the model', () => {
        assert.equals('Custom label is required', model.preValidate('someAttribute', ''));
      });

      it('returns sentence cased name when label is not found', () => {
        assert.equals('Some attribute is required', model.preValidate('some_attribute', ''));
      });

      it('returns sentence cased name when label attribute is not defined', () => {
        class PlainLabelModel extends withValidation(Model<{ someAttribute?: string }>) {
          static validation = {
            someAttribute: {
              required: true,
            },
          };
        }

        const plainModel = new PlainLabelModel();

        assert.equals('Some attribute is required', plainModel.preValidate('someAttribute', ''));
      });
    });

    describe('sentence formatting', () => {
      beforeEach(() => {
        Validation.options.labelFormatter = 'sentenceCase';
      });

      it('sentence cases camel cased attribute name', () => {
        assert.equals('Some attribute is required', model.preValidate('someAttribute', ''));
      });

      it('sentence cases underscore named attribute name', () => {
        assert.equals('Some attribute is required', model.preValidate('some_attribute', ''));
      });

      it('sentence cases underscore named attribute name with multiple underscores', () => {
        assert.equals(
          'Some other attribute is required',
          model.preValidate('some_other_attribute', ''),
        );
      });
    });
  });
});
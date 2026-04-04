import { Collection, Model as NextboneModel } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { Validation, assert, refute, sinon } from './vitest-globals.js';
import { defineLegacySuite } from './run-legacy-suite.js';

const Backbone = { Collection, Model: NextboneModel };

const suite = (() => {
  let exportedSuite;
  exportedSuite = {
    'Mixin validation': {
      beforeEach: function () {
        class Model extends withValidation(Backbone.Model) {
          static validation = {
            name: function (val) {
              if (!val) {
                return 'error';
              }
            },
          };

          set(...args) {
            super.set(...args);
            return this.validationError === null;
          }
        }

        this.model = new Model();
      },

      'isValid is false when model is invalid': function () {
        assert.equals(false, this.model.isValid(true));
      },

      'isValid is true when model is valid': function () {
        this.model.set({ name: 'name' });

        assert.equals(true, this.model.isValid(true));
      },

      'refutes setting invalid value': function () {
        refute(this.model.set({ name: '' }, { validate: true }));
      },

      'succeeds setting valid value': function () {
        assert(this.model.set({ name: 'name' }, { validate: true }));
      },

      'when setting attribute on model without validation': {
        beforeEach: function () {
          this.model = new Backbone.Model();
        },

        'it should not complain': function () {
          assert(this.model.set({ someAttr: 'someValue' }, { validate: true }));
        },
      },
    },
  };

  return exportedSuite;
})();

for (const [suiteName, suiteDefinition] of Object.entries(suite)) {
  defineLegacySuite(suiteName, suiteDefinition);
}

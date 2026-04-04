import { Collection, Model as NextboneModel } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { Validation, assert, refute, sinon } from './vitest-globals.js';
import { defineLegacySuite } from './run-legacy-suite.js';

const Backbone = { Collection, Model: NextboneModel };

const suite = (() => {
  let exportedSuite;
  exportedSuite = {
    'Overriding default callbacks in Backbone.Validation': {
      beforeEach: function () {
        this.originalOptions = {};
        Object.assign(this.originalOptions, Validation.options);

        this.valid = sinon.spy();
        this.invalid = sinon.spy();

        Object.assign(Validation.options, {
          valid: this.valid,
          invalid: this.invalid,
        });

        class Model extends withValidation(Backbone.Model) {
          static validation = {
            age: function (val) {
              if (val === 0) {
                return 'Age is invalid';
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

      afterEach: function () {
        Object.assign(Validation.options, this.originalOptions);
      },

      'validate should call overridden valid callback': function () {
        this.model.set(
          {
            age: 1,
          },
          { validate: true },
        );

        assert.called(this.valid);
      },

      'validate should call overridden invalid callback': function () {
        this.model.set(
          {
            age: 0,
          },
          { validate: true },
        );

        assert.called(this.invalid);
      },
    },
  };

  return exportedSuite;
})();

for (const [suiteName, suiteDefinition] of Object.entries(suite)) {
  defineLegacySuite(suiteName, suiteDefinition);
}

import { Collection, Model as NextboneModel } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { Validation, assert, refute, sinon } from '../vitest-globals.js';
import { defineLegacySuite } from '../run-legacy-suite.js';

const Backbone = { Collection, Model: NextboneModel };

const suite = (() => {
  let exportedSuite;
  exportedSuite = {
    'acceptance validator': {
      beforeEach: function () {
        class Model extends withValidation(Backbone.Model) {
          static validation = {
            agree: {
              acceptance: true,
            },
          };

          set(...args) {
            super.set(...args);
            return this.validationError === null;
          }
        }

        this.model = new Model();
      },

      'has default error message': function (done) {
        this.model.on('validated', function (model, error) {
          assert.equals({ agree: 'Agree must be accepted' }, error);
          done();
        });
        this.model.set({ agree: false }, { validate: true });
      },

      'non-boolean is invalid': function () {
        refute(
          this.model.set(
            {
              agree: 'non-boolean',
            },
            { validate: true },
          ),
        );
      },

      'string with true is evaluated as valid': function () {
        assert(
          this.model.set(
            {
              agree: 'true',
            },
            { validate: true },
          ),
        );
      },

      'false boolean is invalid': function () {
        refute(
          this.model.set(
            {
              agree: false,
            },
            { validate: true },
          ),
        );
      },

      'true boolean is valid': function () {
        assert(
          this.model.set(
            {
              agree: true,
            },
            { validate: true },
          ),
        );
      },
    },
  };

  return exportedSuite;
})();

for (const [suiteName, suiteDefinition] of Object.entries(suite)) {
  defineLegacySuite(suiteName, suiteDefinition);
}

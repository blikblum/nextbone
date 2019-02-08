
module.exports = {
    "oneOf validator": {
        beforeEach: function () {
            this.validation = {
                country: {
                    oneOf: ['Norway', 'Sweeden']
                }
            }

            @validation(this.validation)
            class Model extends Backbone.Model {
              set(...args) {
                super.set(...args)
                return this.validationError === null
              }
            }

            this.model = new Model();
            
        },

        "has default error message": function (done) {
            this.model.on('validated:invalid', function (model, error) {
                assert.equals({ country: 'Country must be one of: Norway, Sweeden' }, error);
                done();
            });
            this.model.set({ country: '' }, { validate: true });
        },

        "value is one of the values in the array is valid": function () {
            assert(this.model.set({
                country: 'Norway'
            }, { validate: true }));
        },

        "value is not one of the values in the arraye is invalid": function () {
            refute(this.model.set({
                country: 'Denmark'
            }, { validate: true }));
        },

        "is case sensitive": function () {
            refute(this.model.set({
                country: 'sweeden'
            }, { validate: true }));
        },

        "when required is not specified": {
            "undefined is invalid": function () {
                refute(this.model.set({
                    country: undefined
                }, { validate: true }));
            },

            "null is invalid": function () {
                refute(this.model.set({
                    country: null
                }, { validate: true }));
            }
        },

        "when required:false": {
            beforeEach: function () {
                this.validation.country.required = false;
            },

            "null is valid": function () {
                assert(this.model.set({
                    country: null
                }, { validate: true }));
            },

            "undefined is valid": function () {
                assert(this.model.set({
                    country: undefined
                }, { validate: true }));
            }
        },

        "when required:true": {
            beforeEach: function () {
                this.validation.country.required = true;
            },

            "undefined is invalid": function () {
                refute(this.model.set({
                    country: undefined
                }, { validate: true }));
            },

            "null is invalid": function () {
                refute(this.model.set({
                    country: null
                }, { validate: true }));
            }
        }
    }
}
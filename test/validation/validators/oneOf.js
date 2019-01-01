module.exports = {
    "oneOf validator": {
        beforeEach: function () {
            var that = this;
            var Model = Backbone.Model.extend({
                validation: {
                    country: {
                        oneOf: ['Norway', 'Sweeden']
                    }
                }
            });

            this.model = new Model();
            _.extend(this.model, Backbone.Validation.mixin);
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
                this.model.validation.country.required = false;
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
                this.model.validation.country.required = true;
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

module.exports = {
    "Mixin validation": {
        beforeEach: function () {
            this.Model = @validation({
              name: function (val) {
                    if (!val) {
                        return 'error';
                    }
                }
            })
            class extends Backbone.Model {
              set(...args) {
                super.set(...args)
                return this.validationError === null
              }
            };

            this.model = new this.Model();
        },

        "isValid is undefined when no validation has occurred": function () {
            refute.defined(new this.Model().isValid());
        },

        "isValid is false when model is invalid": function () {
            assert.equals(false, this.model.isValid(true));
        },

        "isValid is true when model is valid": function () {
            this.model.set({ name: 'name' });

            assert.equals(true, this.model.isValid(true));
        },

        "refutes setting invalid value": function () {
            refute(this.model.set({ name: '' }, { validate: true }));
        },

        "succeeds setting valid value": function () {
            assert(this.model.set({ name: 'name' }, { validate: true }));
        },

        "when forcing update succeeds setting invalid value": function () {
            assert(this.model.set({ name: '' }, { forceUpdate: true, validate: true }));
        },

        "when forcing update globally": {
            beforeEach: function () {
                Backbone.Validation.options.forceUpdate = true;
            },

            afterEach: function () {
                Backbone.Validation.options.forceUpdate = false;
            },

            "succeeds setting invalid value when forcing update globally": function () {
                assert(this.model.set({ name: '' }, { validate: true }));
            }
        },

        "when setting attribute on model without validation": {
            beforeEach: function () {
                this.model = new Backbone.Model();
            },

            "it should not complain": function () {
                assert(this.model.set({ someAttr: 'someValue' }, { validate: true }));
            }
        }
    }
}
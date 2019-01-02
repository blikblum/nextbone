import { validation } from "nextbone/validation";
module.exports = {
    "Mixin validation": {
        beforeEach: function () {
            this.origPrototype = _.clone(Backbone.Model.prototype);

            _.extend(Backbone.Model.prototype, Backbone.Validation.mixin);

            this.Model = @validation({
                name: function (val) {
                    if (!val) {
                        return 'error';
                    }
                }
            })
            class extends Backbone.Model {};

            this.model = new this.Model();
        },

        afterEach: function () {
            Backbone.Model.prototype = this.origPrototype;
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
                Backbone.Validation.configure({
                    forceUpdate: true
                });
            },

            afterEach: function () {
                Backbone.Validation.configure({
                    forceUpdate: false
                });
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
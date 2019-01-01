module.exports = {
    "minLength validator": {
        beforeEach: function () {
            var that = this;
            var Model = Backbone.Model.extend({
                validation: {
                    name: {
                        minLength: 2
                    }
                }
            });

            this.model = new Model();
            _.extend(this.model, Backbone.Validation.mixin);
        },

        "has default error message for string": function (done) {
            this.model.on('validated:invalid', function (model, error) {
                assert.equals({ name: 'Name must be at least 2 characters' }, error);
                done();
            });
            this.model.set({ name: '' }, { validate: true });
        },

        "string with length shorter than minLenght is invalid": function () {
            refute(this.model.set({
                name: 'a'
            }, { validate: true }));
        },

        "string with length equal to minLength is valid": function () {
            assert(this.model.set({
                name: 'aa'
            }, { validate: true }));
        },

        "string with length greater than minLength is valid": function () {
            assert(this.model.set({
                name: 'aaaa'
            }, { validate: true }));
        },

        "spaces are treated as part of the string (no trimming)": function () {
            assert(this.model.set({
                name: 'a '
            }, { validate: true }));
        },

        "non strings are treated as an error": function () {
            refute(this.model.set({
                name: 123
            }, { validate: true }));
        },

        "when required is not specified": {
            "undefined is invalid": function () {
                refute(this.model.set({
                    name: undefined
                }, { validate: true }));
            },

            "null is invalid": function () {
                refute(this.model.set({
                    name: null
                }, { validate: true }));
            }
        },

        "when required:false": {
            beforeEach: function () {
                this.model.validation.name.required = false;
            },

            "null is valid": function () {
                assert(this.model.set({
                    name: null
                }, { validate: true }));
            },

            "undefined is valid": function () {
                assert(this.model.set({
                    name: undefined
                }, { validate: true }));
            }
        },

        "when required:true": {
            beforeEach: function () {
                this.model.validation.name.required = true;
            },

            "undefined is invalid": function () {
                refute(this.model.set({
                    name: undefined
                }, { validate: true }));
            },

            "null is invalid": function () {
                refute(this.model.set({
                    name: null
                }, { validate: true }));
            }
        }
    }
}
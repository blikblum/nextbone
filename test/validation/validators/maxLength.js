module.exports = {
    "maxLength validator": {
        beforeEach: function () {            
            var Model = Backbone.Model.extend({
                validation: {
                    name: {
                        maxLength: 2
                    }
                }
            });

            this.model = new Model();
            _.extend(this.model, Backbone.Validation.mixin);
        },

        "has default error message for string": function (done) {
            this.model.on('validated:invalid', function (model, error) {
                assert.equals({ name: 'Name must be at most 2 characters' }, error);
                done();
            });
            this.model.set({ name: 'aaa' }, { validate: true });
        },

        "string with length longer than maxLenght is invalid": function () {
            refute(this.model.set({
                name: 'aaa'
            }, { validate: true }));
        },

        "string with length equal to maxLength is valid": function () {
            assert(this.model.set({
                name: 'aa'
            }, { validate: true }));
        },

        "string with length shorter than maxLength is valid": function () {
            assert(this.model.set({
                name: 'a'
            }, { validate: true }));
        },

        "spaces are treated as part of the string (no trimming)": function () {
            refute(this.model.set({
                name: 'a  '
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
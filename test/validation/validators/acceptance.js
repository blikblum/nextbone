
module.exports = {
    "acceptance validator": {
        beforeEach: function () {
            var that = this;

            @validation({
                agree: {
                    acceptance: true
                }
            })
            class Model extends Backbone.Model {}

            this.model = new Model();
            
        },

        "has default error message": function (done) {
            this.model.on('validated:invalid', function (model, error) {
                assert.equals({ agree: 'Agree must be accepted' }, error);
                done();
            });
            this.model.set({ agree: false }, { validate: true });
        },

        "non-boolean is invalid": function () {
            refute(this.model.set({
                agree: 'non-boolean'
            }, { validate: true }));
        },

        "string with true is evaluated as valid": function () {
            assert(this.model.set({
                agree: 'true'
            }, { validate: true }));
        },

        "false boolean is invalid": function () {
            refute(this.model.set({
                agree: false
            }, { validate: true }));
        },

        "true boolean is valid": function () {
            assert(this.model.set({
                agree: true
            }, { validate: true }));
        }
    }
}
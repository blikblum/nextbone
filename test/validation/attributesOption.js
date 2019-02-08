
module.exports = {
  "Setting options.attributes": {
      beforeEach: function () {
          @validation({
              age: {
                  required: true
              },
              name: {
                  required: true
              },
              password: {
                  required: true
              },
              email: {
                  pattern: 'email'
              }
          })
          class Model extends Backbone.Model {
              set(...args) {
                super.set(...args)
                return this.validationError === null
              }
            }

          this.model = new Model();
      },

      "through Model.validate options": {
        "only the attributes in array should be validated": function () {
            var errors = this.model.validate(undefined, {attributes: ['name', 'age']});
            assert.defined(errors.name);
            assert.defined(errors.age);
            refute.defined(errors.password);
            refute.defined(errors.email);
        },

        "when all the attributes in array are valid": {
            beforeEach: function () {
                this.model.set({
                    age: 1,
                    name: 'hello',
                    email: 'invalidemail'
                });
            },
            "validation will pass": function () {
                var errors = this.model.validate(undefined, {attributes: ['name', 'age']});
                refute.defined(errors);
            }
        }
    }
  }
}
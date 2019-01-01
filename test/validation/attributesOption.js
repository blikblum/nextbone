module.exports = {
  "Setting options.attributes": {
      beforeEach: function () {
          var Model = Backbone.Model.extend({
              validation: {
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
              }
          });

          this.model = new Model();          
      },

      "through Model.validate options": {
        beforeEach: function () {
            Object.assign(this.model, Backbone.Validation.mixin)
        },

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
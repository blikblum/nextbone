module.exports = {
  'Setting options.attributes': {
    beforeEach: function() {
      @withSchema
      class Model extends Backbone.Model {
        static schema = z.object({
          age: z.number({ message: 'Age is required' }),
          name: z.string().min(1, 'Name is required'),
          password: z.string().min(1, 'Password is required'),
          email: z.string().email('Invalid email')
        });

        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }

      this.model = new Model();
    },

    'through Model.validate options': {
      'only the attributes in array should be validated': function() {
        var errors = this.model.validate(undefined, {
          attributes: ['name', 'age']
        });
        assert.defined(errors.name);
        assert.defined(errors.age);
        refute.defined(errors.password);
        refute.defined(errors.email);
      },

      'when all the attributes in array are valid': {
        beforeEach: function() {
          this.model.set({
            age: 1,
            name: 'hello',
            email: 'invalidemail'
          });
        },
        'validation will pass': function() {
          var errors = this.model.validate(undefined, {
            attributes: ['name', 'age']
          });
          refute.defined(errors);
        }
      }
    }
  }
};

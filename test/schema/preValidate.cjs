module.exports = {
  preValidate: {
    'when model has defined schema': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            name: z.string().min(1, 'Name is required'),
            email: z.string().email('Invalid email')
          });
        }

        this.model = new Model();
      },

      'returns nothing when single attribute is valid': function() {
        refute(this.model.preValidate('name', 'valid name'));
      },

      'returns error message when single attribute is invalid': function() {
        assert.defined(this.model.preValidate('name', ''));
      },

      'returns undefined when multiple attributes are valid': function() {
        refute.defined(this.model.preValidate({
          name: 'valid name',
          email: 'test@example.com'
        }));
      },

      'returns errors when multiple attributes are invalid': function() {
        var errors = this.model.preValidate({
          name: '',
          email: 'invalid'
        });

        assert.defined(errors);
        assert.defined(errors.name);
        assert.defined(errors.email);
      },

      'returns error only for invalid attributes': function() {
        var errors = this.model.preValidate({
          name: '',
          email: 'test@example.com'
        });

        assert.defined(errors);
        assert.defined(errors.name);
        refute.defined(errors.email);
      },

      'does not update the model': function() {
        this.model.set({ name: 'initial' });
        this.model.preValidate('name', 'changed');

        assert.equals(this.model.get('name'), 'initial');
      },

      'does not update the model for multiple attributes': function() {
        this.model.set({ name: 'initial', email: 'initial@example.com' });
        this.model.preValidate({
          name: 'changed',
          email: 'changed@example.com'
        });

        assert.equals(this.model.get('name'), 'initial');
        assert.equals(this.model.get('email'), 'initial@example.com');
      }
    },

    'when model has no schema': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {}

        this.model = new Model();
      },

      'returns undefined': function() {
        refute.defined(this.model.preValidate('anyField', 'anyValue'));
      }
    },

    'with attribute not in schema': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            name: z.string().min(1, 'Name is required')
          });
        }

        this.model = new Model();
      },

      'returns empty string for attribute not in schema': function() {
        var result = this.model.preValidate('unknownField', 'value');
        assert.equals(result, '');
      }
    }
  }
};

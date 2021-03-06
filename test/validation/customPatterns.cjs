module.exports = {
  'Extending Backbone.Validation with custom pattern': {
    beforeEach: function() {
      Object.assign(Validation.patterns, {
        custom: /^test/
      });

      @withValidation
      class Model extends Backbone.Model {
        static validation = {
          name: {
            pattern: 'custom'
          }
        };

        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }

      this.model = new Model();
    },

    'should execute the custom pattern validator': function() {
      assert(
        this.model.set(
          {
            name: 'test'
          },
          { validate: true }
        )
      );
      refute(
        this.model.set(
          {
            name: 'aa'
          },
          { validate: true }
        )
      );
    }
  },

  'Overriding builtin pattern in Backbone.Validation': {
    beforeEach: function() {
      this.builtinEmail = Validation.patterns.email;

      Object.assign(Validation.patterns, {
        email: /^test/
      });

      @withValidation
      class Model extends Backbone.Model {
        static validation = {
          name: {
            pattern: 'email'
          }
        };

        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }

      this.model = new Model();
    },

    afterEach: function() {
      Validation.patterns.email = this.builtinEmail;
    },

    'should execute the custom pattern validator': function() {
      assert(
        this.model.set(
          {
            name: 'test'
          },
          { validate: true }
        )
      );
      refute(
        this.model.set(
          {
            name: 'aa'
          },
          { validate: true }
        )
      );
    }
  }
};

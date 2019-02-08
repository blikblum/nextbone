
module.exports = {
  'Extending Backbone.Validation with custom pattern': {
    beforeEach: function () {
      _.extend(Backbone.Validation.patterns, {
        custom: /^test/
      });

      @validation({
        name: {
          pattern: 'custom'
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

    "should execute the custom pattern validator": function () {
      assert(this.model.set({
        name: 'test'
      }, { validate: true }));
      refute(this.model.set({
        name: 'aa'
      }, { validate: true }));
    }
  },

  'Overriding builtin pattern in Backbone.Validation': {
    beforeEach: function () {
      this.builtinEmail = Backbone.Validation.patterns.email;

      _.extend(Backbone.Validation.patterns, {
        email: /^test/
      });

      @validation({
        name: {
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

    afterEach: function () {
      Backbone.Validation.patterns.email = this.builtinEmail;
    },

    "should execute the custom pattern validator": function () {
      assert(this.model.set({
        name: 'test'
      }, { validate: true }));
      refute(this.model.set({
        name: 'aa'
      }, { validate: true }));
    }
  }

}




module.exports = {
  'Extending Backbone.Validation with custom pattern': {
    beforeEach: function () {
      _.extend(Backbone.Validation.patterns, {
        custom: /^test/
      });

      var Model = Backbone.Model.extend({
        validation: {
          name: {
            pattern: 'custom'
          }
        }
      });

      this.model = new Model();
      _.extend(this.model, Backbone.Validation.mixin);
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

      var Model = Backbone.Model.extend({
        validation: {
          name: {
            pattern: 'email'
          }
        }
      });

      this.model = new Model();
      _.extend(this.model, Backbone.Validation.mixin);
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




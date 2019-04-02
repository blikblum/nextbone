module.exports = {
  'Overriding default callbacks in Backbone.Validation': {
    beforeEach: function() {
      this.originalOptions = {};
      _.extend(this.originalOptions, Backbone.Validation.options);

      this.valid = sinon.spy();
      this.invalid = sinon.spy();

      _.extend(Backbone.Validation.options, {
        valid: this.valid,
        invalid: this.invalid
      });

      @validation({
        age: function(val) {
          if (val === 0) {
            return 'Age is invalid';
          }
        }
      })
      class Model extends Backbone.Model {
        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }

      this.model = new Model();
    },

    afterEach: function() {
      _.extend(Backbone.Validation.options, this.originalOptions);
    },

    'validate should call overridden valid callback': function() {
      this.model.set(
        {
          age: 1
        },
        { validate: true }
      );

      assert.called(this.valid);
    },

    'validate should call overridden invalid callback': function() {
      this.model.set(
        {
          age: 0
        },
        { validate: true }
      );

      assert.called(this.invalid);
    }
  }
};

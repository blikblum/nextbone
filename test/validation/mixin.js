module.exports = {
  'Mixin validation': {
    beforeEach: function() {
      this.Model =
        @validation({
          name: function(val) {
            if (!val) {
              return 'error';
            }
          }
        })
        class extends Backbone.Model {
          set(...args) {
            super.set(...args);
            return this.validationError === null;
          }
        };

      this.model = new this.Model();
    },

    'isValid is false when model is invalid': function() {
      assert.equals(false, this.model.isValid(true));
    },

    'isValid is true when model is valid': function() {
      this.model.set({ name: 'name' });

      assert.equals(true, this.model.isValid(true));
    },

    'refutes setting invalid value': function() {
      refute(this.model.set({ name: '' }, { validate: true }));
    },

    'succeeds setting valid value': function() {
      assert(this.model.set({ name: 'name' }, { validate: true }));
    },

    'when setting attribute on model without validation': {
      beforeEach: function() {
        this.model = new Backbone.Model();
      },

      'it should not complain': function() {
        assert(this.model.set({ someAttr: 'someValue' }, { validate: true }));
      }
    }
  }
};

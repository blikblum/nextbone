module.exports = {
  'named method validator': {
    beforeEach: function() {
      var that = this;

      @validation({
        name: {
          fn: 'validateName'
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

    'is invalid when method returns error message': function() {
      refute(this.model.set({ name: '' }, { validate: true }));
    },

    'is valid when method returns undefined': function() {
      assert(this.model.set({ name: 'backbone' }, { validate: true }));
    },

    'context is the model': function() {
      this.model.set({ name: '' }, { validate: true });
      assert.same(this.ctx, this.model);
    },

    'second argument is the name of the attribute being validated': function() {
      this.model.set({ name: '' }, { validate: true });
      assert.equals('name', this.attr);
    },

    'third argument is a computed model state': function() {
      this.model.set({ attr: 'attr' });
      this.model.set(
        {
          name: 'name',
          age: 1
        },
        { validate: true }
      );

      assert.equals({ attr: 'attr', name: 'name', age: 1 }, this.computed);
    }
  }
};

module.exports = {
  'named method validator short hand syntax': {
    beforeEach: function() {
      var that = this;

      @validation({
        name: 'validateName'
      })
      class Model extends Backbone.Model {
        validateName(val, attr, computed) {
          that.ctx = this;
          that.attr = attr;
          that.computed = computed;
          if (val !== 'backbone') {
            return 'Error';
          }
        }

        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }
      this.model = new Model();
    },

    'is invalid when method returns error message': function() {
      refute(this.model.set({ name: '' }, { validate: true }));
    },

    'is valid when method returns undefined': function() {
      assert(this.model.set({ name: 'backbone' }, { validate: true }));
    },

    'context is the model': function() {
      this.model.set({ name: '' }, { validate: true });
      assert.same(this.ctx, this.model);
    },

    'second argument is the name of the attribute being validated': function() {
      this.model.set({ name: '' }, { validate: true });
      assert.equals('name', this.attr);
    },

    'third argument is a computed model state': function() {
      this.model.set({ attr: 'attr' });
      this.model.set(
        {
          name: 'name',
          age: 1
        },
        { validate: true }
      );

      assert.equals({ attr: 'attr', name: 'name', age: 1 }, this.computed);
    }
  }
};

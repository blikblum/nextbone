module.exports = {
  isValid: {
    'when model has not defined any validation': {
      beforeEach: function() {
        this.model = new Backbone.Model();
      },

      'returns true': function() {
        assert.equals(this.model.isValid(), true);
      }
    },

    'when model has defined validation': {
      beforeEach: function() {
        @validation({
          name: {
            required: true
          }
        })
        class Model extends Backbone.Model {}

        this.model = new Model();
      },

      'returns true when model is valid': function() {
        this.model.set({ name: 'name' });

        assert.equals(this.model.isValid(), true);
      },

      'returns false when model is invalid': function() {
        assert.equals(this.model.isValid(), false);

        this.model.set({ name: '' });

        assert.equals(this.model.isValid(), false);
      },

      'set validationError when model is invalid': function() {
        this.model.set({ name: '' });

        this.model.isValid();

        assert(this.model.validationError);
        assert(this.model.validationError.name);
      },

      'invalid is triggered when model is invalid': function(done) {
        this.model.on('invalid', function(model, attrs) {
          done();
        });
        refute(this.model.isValid());
      },

      'and passing name of attribute': {
        beforeEach: function() {
          @validation({
            name: {
              required: true
            },
            age: {
              required: true
            }
          })
          class Model extends Backbone.Model {}
          this.model = new Model();
        },

        'returns false when attribute is invalid': function() {
          refute(this.model.isValid('name'));
        },

        'invalid is triggered when attribute is invalid': function(done) {
          this.model.on('invalid', function(model, attrs) {
            done();
          });
          refute(this.model.isValid('name'));
        },

        'returns true when attribute is valid': function() {
          this.model.set({ name: 'name' });

          assert.equals(this.model.isValid('name'), true);
        }
      },

      'and passing array of attributes': {
        beforeEach: function() {
          @validation({
            name: {
              required: true
            },
            age: {
              required: true
            },
            phone: {
              required: true
            }
          })
          class Model extends Backbone.Model {}
          this.model = new Model();
        },

        'returns false when all attributes are invalid': function() {
          refute(this.model.isValid(['name', 'age']));
        },

        'returns false when one attribute is invalid': function() {
          this.model.set({ name: 'name' });

          refute(this.model.isValid(['name', 'age']));
        },

        'returns true when all attributes are valid': function() {
          this.model.set({ name: 'name', age: 1 });

          assert.equals(this.model.isValid(['name', 'age']), true);
        }
      }
    }
  }
};

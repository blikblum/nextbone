module.exports = {
  'Backbone.Validation events': {
    beforeEach: function() {
      @validation({
        age: function(val) {
          if (!val) {
            return 'age';
          }
        },
        name: function(val) {
          if (!val) {
            return 'name';
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

    'model is updated before the events are raised': function() {
      this.model.on(
        'change',
        function() {
          assert.equals(1, this.model.get('age'));
        },
        this
      );

      this.model.on(
        'validated',
        function() {
          assert.equals(1, this.model.get('age'));
        },
        this
      );

      this.model.set(
        {
          age: 1,
          name: 'name'
        },
        { validate: true }
      );
    },

    'when model is valid': {
      'validated event is triggered with model and null as errors': function(done) {
        this.model.once(
          'validated',
          function(model, errors) {
            assert.same(null, errors);
            assert.same(this.model, model);
            done();
          },
          this
        );

        this.model.set(
          {
            age: 1,
            name: 'name'
          },
          { validate: true }
        );
      }
    },

    'when one invalid value is set': {
      'validated event is triggered with model and an object with the names of the attributes with error': function(
        done
      ) {
        this.model.on(
          'validated',
          function(model, attr) {
            assert.same(this.model, model);
            assert.equals({ age: 'age', name: 'name' }, attr);
            done();
          },
          this
        );

        this.model.set({ age: 0 }, { validate: true });
      },

      'invalid event is triggered with model and an object with the names of the attributes with error': function(
        done
      ) {
        this.model.on(
          'invalid',
          function(model, attr) {
            assert.same(this.model, model);
            assert.equals({ age: 'age', name: 'name' }, attr);
            done();
          },
          this
        );

        this.model.set({ age: 0 }, { validate: true });
      }
    },

    'when one valid value is set': {
      'validated event is triggered with model and an object with the names of the attributes with error': function(
        done
      ) {
        this.model.on(
          'validated',
          function(model, attrs) {
            assert.same(this.model, model);
            assert.equals({ name: 'name' }, attrs);
            done();
          },
          this
        );

        this.model.set(
          {
            age: 1
          },
          { validate: true }
        );
      }
    }
  }
};

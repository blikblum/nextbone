module.exports = {
  'Events': {
    beforeEach: function() {
      @withSchema
      class Model extends Backbone.Model {
        static schema = z.object({
          name: z.string().min(1, 'Name is required'),
          age: z.number({ message: 'Age must be a number' })
        });

        set(...args) {
          super.set(...args);
          return this.validationError === null;
        }
      }

      this.model = new Model();
    },

    'validated event is triggered after validation': {
      'with valid model': function(done) {
        this.model.set({ name: 'test', age: 25 });

        this.model.on('validated', function(model, invalidAttrs) {
          assert.same(model, this.model);
          assert.same(invalidAttrs, null);
          done();
        }.bind(this));

        this.model.validate();
      },

      'with invalid model': function(done) {
        this.model.on('validated', function(model, invalidAttrs) {
          assert.same(model, this.model);
          assert.defined(invalidAttrs);
          assert.defined(invalidAttrs.name);
          done();
        }.bind(this));

        this.model.validate();
      }
    },

    'invalid event is triggered when isValid returns false': function(done) {
      this.model.on('invalid', function(model, error, options) {
        assert.same(model, this.model);
        assert.defined(error);
        done();
      }.bind(this));

      this.model.isValid();
    },

    'invalid event is not triggered when isValid returns true': function() {
      var spy = sinon.spy();
      this.model.set({ name: 'test', age: 25 });

      this.model.on('invalid', spy);

      this.model.isValid();

      refute(spy.called);
    }
  }
};

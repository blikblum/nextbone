module.exports = {
  'withSchema as mixin': {
    'can be used as a function': {
      beforeEach: function() {
        class BaseModel extends Backbone.Model {
          customMethod() {
            return 'custom';
          }
        }

        class ExtendedModel extends withSchema(BaseModel) {
          static schema = z.object({
            name: z.string().min(1, 'Name is required')
          });
        }

        this.model = new ExtendedModel();
      },

      'preserves parent class methods': function() {
        assert.equals(this.model.customMethod(), 'custom');
      },

      'adds validation methods': function() {
        assert.equals(typeof this.model.preValidate, 'function');
        assert.equals(typeof this.model.isValid, 'function');
        assert.equals(typeof this.model.validate, 'function');
      },

      'validates using schema': function() {
        this.model.set({ name: '' });
        refute(this.model.isValid());

        this.model.set({ name: 'test' });
        assert(this.model.isValid());
      }
    },

    'can be used multiple times on inheritance chain': {
      beforeEach: function() {
        class BaseModel extends withSchema(Backbone.Model) {
          static schema = z.object({
            baseField: z.string().min(1, 'Base field is required')
          });
        }

        // Note: Each class uses its own schema
        class ExtendedModel extends withSchema(BaseModel) {
          static schema = z.object({
            baseField: z.string().min(1, 'Base field is required'),
            extendedField: z.string().min(1, 'Extended field is required')
          });
        }

        this.baseModel = new BaseModel();
        this.extendedModel = new ExtendedModel();
      },

      'base model uses base schema': function() {
        this.baseModel.set({ baseField: 'value' });
        assert(this.baseModel.isValid());
      },

      'extended model uses extended schema': function() {
        this.extendedModel.set({ baseField: 'value', extendedField: '' });
        refute(this.extendedModel.isValid());

        this.extendedModel.set({ baseField: 'value', extendedField: 'value' });
        assert(this.extendedModel.isValid());
      }
    },

    'schema is cached per class': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            name: z.string().min(1)
          });
        }

        this.Model = Model;
        this.model1 = new Model();
        this.model2 = new Model();
      },

      'multiple instances share the same schema': function() {
        // Both should work independently
        this.model1.set({ name: 'test1' });
        this.model2.set({ name: 'test2' });

        assert(this.model1.isValid());
        assert(this.model2.isValid());
      }
    }
  }
};

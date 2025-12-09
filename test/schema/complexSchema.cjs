module.exports = {
  'Complex Schema Validation': {
    'nested objects': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            person: z.object({
              name: z.string().min(1, 'Name is required'),
              address: z.object({
                street: z.string().min(1, 'Street is required'),
                city: z.string().min(1, 'City is required')
              })
            })
          });
        }

        this.model = new Model();
      },

      'validates valid nested object': function() {
        this.model.set({
          person: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'New York'
            }
          }
        }, { validate: true });

        assert(this.model.isValid());
      },

      'validates invalid nested object': function() {
        this.model.set({
          person: {
            name: '',
            address: {
              street: '',
              city: ''
            }
          }
        }, { validate: true });

        refute(this.model.isValid());
      }
    },

    'arrays': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            tags: z.array(z.string()).min(1, 'At least one tag required'),
            scores: z.array(z.number()).max(5, 'Maximum 5 scores')
          });
        }

        this.model = new Model();
      },

      'validates valid arrays': function() {
        this.model.set({
          tags: ['tag1', 'tag2'],
          scores: [10, 20, 30]
        }, { validate: true });

        assert(this.model.isValid());
      },

      'validates empty array when min is set': function() {
        this.model.set({
          tags: [],
          scores: [1]
        }, { validate: true });

        refute(this.model.isValid());
      },

      'validates array exceeding max': function() {
        this.model.set({
          tags: ['tag1'],
          scores: [1, 2, 3, 4, 5, 6]
        }, { validate: true });

        refute(this.model.isValid());
      }
    },

    'optional fields': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            name: z.string().min(1, 'Name is required'),
            nickname: z.string().optional(),
            age: z.number().optional()
          });
        }

        this.model = new Model();
      },

      'validates with required field only': function() {
        this.model.set({ name: 'John' }, { validate: true });

        assert(this.model.isValid());
      },

      'validates with all fields including optional': function() {
        this.model.set({
          name: 'John',
          nickname: 'Johnny',
          age: 25
        }, { validate: true });

        assert(this.model.isValid());
      },

      'validates with undefined optional fields': function() {
        this.model.set({
          name: 'John',
          nickname: undefined,
          age: undefined
        }, { validate: true });

        assert(this.model.isValid());
      }
    },

    'nullable fields': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            name: z.string().min(1, 'Name is required'),
            description: z.string().nullable()
          });
        }

        this.model = new Model();
      },

      'validates null value for nullable field': function() {
        this.model.set({
          name: 'John',
          description: null
        }, { validate: true });

        assert(this.model.isValid());
      },

      'validates string value for nullable field': function() {
        this.model.set({
          name: 'John',
          description: 'A description'
        }, { validate: true });

        assert(this.model.isValid());
      }
    },

    'union types': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            value: z.union([z.string(), z.number()])
          });
        }

        this.model = new Model();
      },

      'validates string in union': function() {
        this.model.set({ value: 'hello' }, { validate: true });

        assert(this.model.isValid());
      },

      'validates number in union': function() {
        this.model.set({ value: 42 }, { validate: true });

        assert(this.model.isValid());
      },

      'rejects invalid type in union': function() {
        this.model.set({ value: true }, { validate: true });

        refute(this.model.isValid());
      }
    },

    'enum validation': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            status: z.enum(['active', 'inactive', 'pending'])
          });
        }

        this.model = new Model();
      },

      'validates valid enum value': function() {
        this.model.set({ status: 'active' }, { validate: true });

        assert(this.model.isValid());
      },

      'rejects invalid enum value': function() {
        this.model.set({ status: 'unknown' }, { validate: true });

        refute(this.model.isValid());
      }
    },

    'custom error messages': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            email: z.string().email('Please enter a valid email address'),
            age: z.number().min(18, 'You must be at least 18 years old')
          });
        }

        this.model = new Model();
      },

      'returns custom error message for invalid email': function() {
        var errors = this.model.preValidate('email', 'invalid');

        assert.equals(errors, 'Please enter a valid email address');
      },

      'returns custom error message for invalid age': function() {
        var errors = this.model.preValidate('age', 10);

        assert.equals(errors, 'You must be at least 18 years old');
      }
    },

    'refine validation': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            password: z.string()
              .min(8, 'Password must be at least 8 characters')
              .refine(
                val => /[A-Z]/.test(val),
                { message: 'Password must contain an uppercase letter' }
              )
          });
        }

        this.model = new Model();
      },

      'validates password with all requirements': function() {
        this.model.set({ password: 'MyPassword123' }, { validate: true });

        assert(this.model.isValid());
      },

      'rejects password too short': function() {
        var errors = this.model.preValidate('password', 'Short');

        assert.defined(errors);
      },

      'rejects password without uppercase': function() {
        var errors = this.model.preValidate('password', 'lowercase123');

        assert.defined(errors);
      }
    }
  }
};

module.exports = {
  'withSchema': {
    beforeEach: function() {
      @withSchema
      class Model extends Backbone.Model {
        static schema = z.object({
          age: z.number({ message: 'Age is invalid' }),
          name: z.string().min(1, 'Name is invalid')
        });

        set(...args) {
          super.set(...args);
          return this.validationError ? null : this;
        }
      }

      this.model = new Model();
    },

    'when bound to model with two validated attributes': {
      beforeEach: function() {},

      'attribute without validator should be set successfully': function() {
        assert(
          this.model.set(
            {
              someProperty: true
            },
            { validate: true }
          )
        );
      },

      'and setting': {
        'one valid value': {
          beforeEach: function() {
            this.model.set(
              {
                age: 1
              },
              { validate: true }
            );
          },

          'should return the model': function() {
            assert.same(
              this.model.set(
                {
                  age: 1
                },
                { validate: true }
              ),
              this.model
            );
          },

          'should update the model': function() {
            assert.equals(this.model.get('age'), 1);
          },

          'model should be invalid': function() {
            refute(this.model.isValid());
          }
        },

        'one invalid value': {
          beforeEach: function() {
            this.model.set(
              {
                age: 'not a number'
              },
              { validate: true }
            );
          },

          'should return false': function() {
            refute(
              this.model.set(
                {
                  age: 'not a number'
                },
                { validate: true }
              )
            );
          },

          'should update the model': function() {
            assert.equals(this.model.get('age'), 'not a number');
          },

          'model should be invalid': function() {
            refute(this.model.isValid());
          }
        },

        'two valid values': {
          beforeEach: function() {
            this.model.set(
              {
                age: 1,
                name: 'hello'
              },
              { validate: true }
            );
          },

          'model should be valid': function() {
            assert(this.model.isValid());
          }
        },

        'two invalid values': {
          beforeEach: function() {
            this.model.set(
              {
                age: 'not a number',
                name: ''
              },
              { validate: true }
            );
          },

          'model should be invalid': function() {
            refute(this.model.isValid());
          }
        },

        'first value invalid and second value valid': {
          beforeEach: function() {
            this.result = this.model.set(
              {
                age: 1,
                name: ''
              },
              { validate: true }
            );
          },

          'model is not updated': function() {
            refute(this.result);
          },

          'model should be invalid': function() {
            refute(this.model.isValid());
          }
        },

        'first value valid and second value invalid': {
          beforeEach: function() {
            this.result = this.model.set(
              {
                age: 'not a number',
                name: 'name'
              },
              { validate: true }
            );
          },

          'model is not updated': function() {
            refute(this.result);
          },

          'model should be invalid': function() {
            refute(this.model.isValid());
          }
        },

        'one value at a time correctly marks the model as either valid or invalid': function() {
          refute(this.model.isValid());

          this.model.set(
            {
              age: 'not a number'
            },
            { validate: true }
          );
          refute(this.model.isValid());

          this.model.set(
            {
              age: 1
            },
            { validate: true }
          );
          refute(this.model.isValid());

          this.model.set(
            {
              name: 'hello'
            },
            { validate: true }
          );
          assert(this.model.isValid());

          this.model.set(
            {
              age: 'not a number'
            },
            { validate: true }
          );
          refute(this.model.isValid());
        }
      },

      'and validate is explicitly called with no parameters': {
        beforeEach: function() {
          this.invalid = sinon.spy();
          this.valid = sinon.spy();
          @withSchema
          class Model extends Backbone.Model {
            static schema = z.object({
              age: z.number().min(1, 'error'),
              name: z.string().min(1, 'error')
            });

            set(...args) {
              super.set(...args);
              return this.validationError === null;
            }
          }
          this.model = new Model();
        },

        'all attributes on the model is validated when nothing has been set': function() {
          this.model.validate(undefined, {
            valid: this.valid,
            invalid: this.invalid
          });

          assert.calledWith(this.invalid, 'age');
          assert.calledWith(this.invalid, 'name');
        },

        'all attributes on the model is validated when one property has been set without validating': function() {
          this.model.set({ age: 1 });

          this.model.validate(undefined, {
            valid: this.valid,
            invalid: this.invalid
          });

          assert.calledWith(this.valid, 'age');
          assert.calledWith(this.invalid, 'name');
        },

        'all attributes on the model is validated when two properties has been set without validating': function() {
          this.model.set({ age: 1, name: 'name' });

          this.model.validate(undefined, {
            valid: this.valid,
            invalid: this.invalid
          });

          assert.calledWith(this.valid, 'age');
          assert.calledWith(this.valid, 'name');
        },

        'callbacks are not called for unvalidated attributes': function() {
          this.model.set({ age: 1, name: 'name', someProp: 'some value' });

          this.model.validate(undefined, {
            valid: this.valid,
            invalid: this.invalid
          });

          assert.calledWith(this.valid, 'age');
          assert.calledWith(this.valid, 'name');
          refute.calledWith(this.valid, 'someProp');
        }
      }
    },

    'when bound to model with three validators on one attribute': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {
          static schema = z.object({
            postalCode: z.string().regex(/^\d+$/, 'Must be digits').min(2, 'Too short').max(4, 'Too long')
          });
        }

        this.model = new Model();
      },

      'and violating the first validator (too short) the model is invalid': function() {
        this.model.set({ postalCode: '1' }, { validate: true });

        refute(this.model.isValid());
      },

      'and violating the pattern validator the model is invalid': function() {
        this.model.set({ postalCode: 'ab' }, { validate: true });

        refute(this.model.isValid());
      },

      'and violating the max length validator the model is invalid': function() {
        this.model.set({ postalCode: '12345' }, { validate: true });

        refute(this.model.isValid());
      },

      'and conforming to all validators the model is valid': function() {
        this.model.set({ postalCode: '123' }, { validate: true });

        assert(this.model.isValid());
      }
    },

    'when bound to model with custom toJSON': {
      beforeEach: function() {
        this.model.toJSON = function() {
          return {
            person: {
              age: this.attributes.age,
              name: this.attributes.name
            }
          };
        };
      },

      'and conforming to all validators the model is valid': function() {
        this.model.set({ age: 12 }, { validate: true });
        this.model.set({ name: 'Jack' }, { validate: true });

        this.model.validate();
        assert(this.model.isValid());
      }
    },

    'when bound to model without schema': {
      beforeEach: function() {
        @withSchema
        class Model extends Backbone.Model {}

        this.model = new Model();
      },

      isValid: function() {
        assert(this.model.isValid());
      },

      validate: function() {
        refute(this.model.validate());
      },

      preValidate: function() {
        refute(this.model.preValidate());
      }
    }
  }
};

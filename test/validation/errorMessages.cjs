module.exports = {
  'Specifying error messages': {
    beforeEach: function() {
      this.invalid = sinon.spy();
    },

    'per validator': {
      beforeEach: function() {
        @withValidation
        class Model extends Backbone.Model {
          static validation = {
            email: [
              {
                required: true,
                msg: 'required'
              },
              {
                pattern: 'email',
                msg: function() {
                  return 'pattern';
                }
              }
            ]
          };

          set(...args) {
            super.set(...args);
            return this.validationError === null;
          }
        }
        this.model = new Model();
      },

      'and violating first validator returns msg specified for first validator': function() {
        this.model.set({ email: '' }, { validate: true, invalid: this.invalid });

        assert(this.invalid.calledWith('email', 'required'));
      },

      'and violating second validator returns msg specified for second validator': function() {
        this.model.set({ email: 'a' }, { validate: true, invalid: this.invalid });

        assert(this.invalid.calledWith('email', 'pattern'));
      }
    },

    'per attribute': {
      beforeEach: function() {
        @withValidation
        class Model extends Backbone.Model {
          static validation = {
            email: {
              required: true,
              pattern: 'email',
              msg: 'error'
            }
          };

          set(...args) {
            super.set(...args);
            return this.validationError === null;
          }
        }
        this.model = new Model();
      },

      'and violating first validator returns msg specified for attribute': function() {
        this.model.set({ email: '' }, { validate: true, invalid: this.invalid });

        assert(this.invalid.calledWith('email', 'error'));
      },

      'and violating second validator returns msg specified for attribute': function() {
        this.model.set({ email: 'a' }, { validate: true, invalid: this.invalid });

        assert(this.invalid.calledWith('email', 'error'));
      }
    }
  }
};

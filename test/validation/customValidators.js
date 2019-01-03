
module.exports = {

  'Extending Backbone.Validation with custom validator': {
    beforeEach: function () {
      var that = this;
      _.extend(Backbone.Validation.validators, {
        custom: function (value, attr, customValue) {
          that.context = this;
          if (value !== customValue) {
            return 'error';
          }
        }
      });

      @validation({
        age: {
          custom: 1
        }
      })
      class Model extends Backbone.Model {}

      this.model = new Model();
      
    },

    "should execute the custom validator": function () {
      assert(this.model.set({
        age: 1
      }, { validate: true }));
      refute(this.model.set({
        age: 2
      }, { validate: true }));
    }
  },

  'Defining a custom validator as a string': {
    beforeEach: function () {
      @validation({
        age: 'validateAge'
      })
      class Model extends Backbone.Model {
        validateAge(value, attr, computedState) {
          if (value != 1) return 'Age invalid'
        }
      }

      this.model = new Model();
      
      this.validateAgeSpy = sinon.spy(this.model, 'validateAge');
    },

    'should execute corresponding method in model': function () {
      assert(this.model.set({
        age: 1
      }, { validate: true }));
      sinon.assert.calledOnce(this.validateAgeSpy);
      assert(this.model.set({
        age: '1'
      }, { validate: true }));
      sinon.assert.calledTwice(this.validateAgeSpy);
      refute(this.model.set({
        age: 2
      }, { validate: true }));
      sinon.assert.calledThrice(this.validateAgeSpy);
    }
  },

  'Defining a custom validator as a string array': {
    beforeEach: function () {
      @validation({
        age: ['validateAge', 'validateNumber']
      })
      class Model extends Backbone.Model {
        validateAge(value, attr, computedState) {
          if (value != 1) return 'Age invalid'
        }

        validateNumber(value, attr, computedState) {
          if (typeof value !== 'number') return 'Not a number'
        }
      }

      this.model = new Model();
      
      this.validateAgeSpy = sinon.spy(this.model, 'validateAge');
      this.validateNumberSpy = sinon.spy(this.model, 'validateNumber');
    },

    'should use corresponding methods in model': function () {
      assert(this.model.set({
        age: 1
      }, { validate: true }));
      sinon.assert.calledOnce(this.validateAgeSpy);
      sinon.assert.calledOnce(this.validateNumberSpy);
      refute(this.model.set({
        age: '1'
      }, { validate: true }));
      sinon.assert.calledTwice(this.validateAgeSpy);
      sinon.assert.calledTwice(this.validateNumberSpy);
    }
  },

  'Overriding built-in validator in Backbone.Validation': {
    beforeEach: function () {
      this.builtinMin = Backbone.Validation.validators.min;

      _.extend(Backbone.Validation.validators, {
        min: function (value, attr, customValue) {
          if (value !== customValue) {
            return 'error';
          }
        }
      });

      @validation({
        age: {
          min: 1
        }
      })
      class Model extends Backbone.Model {}

      this.model = new Model();
      
    },

    afterEach: function () {
      Backbone.Validation.validators.min = this.builtinMin;
    },

    "should execute the overridden validator": function () {
      assert(this.model.set({
        age: 1
      }, { validate: true }));
      refute(this.model.set({
        age: 2
      }, { validate: true }));
    }
  },

  "Chaining built-in validators with custom": {
    beforeEach: function () {
      _.extend(Backbone.Validation.validators, {
        custom2: function (value, attr, customValue, model) {
          if (value !== customValue) {
            return 'error';
          }
        },
        custom: function (value, attr, customValue, model) {
          return this.required(value, attr, true, model) || this.custom2(value, attr, customValue, model);
        }
      });

      @validation({
        name: {
          custom: 'custom'
        }
      })
      class Model extends Backbone.Model {}

      this.model = new Model();
      
    },

    "violating first validator in chain return first error message": function () {
      assert.equals({ name: 'Name is required' }, this.model.validate({ name: '' }));
    },

    "violating second validator in chain return second error message": function () {
      assert.equals({ name: 'error' }, this.model.validate({ name: 'a' }));
    },

    "violating none of the validators returns undefined": function () {
      refute.defined(this.model.validate({ name: 'custom' }));
    }
  },


  "Formatting custom validator messages": {
    beforeEach: function () {
      _.extend(Backbone.Validation.validators, {
        custom: function (value, attr, customValue, model) {
          if (value !== customValue) {
            return this.format("{0} must be equal to {1}", this.formatLabel(attr, model), customValue);
          }
        }
      });

      @validation({
        name: {
          custom: 'custom'
        }
      })
      class Model extends Backbone.Model {}

      this.model = new Model();
      
    },

    "a custom validator can return a formatted message": function () {
      assert.equals({ name: 'Name must be equal to custom' }, this.model.validate({ name: '' }));
    }
  }


}






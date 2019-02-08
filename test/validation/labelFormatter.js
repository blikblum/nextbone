
module.exports = {
  'Label formatters': {
    "Attribute names on the model can be formatted in error messages using": {
      beforeEach: function () {
        @validation({
          someAttribute: {
            required: true
          },
          some_attribute: {
            required: true
          },
          some_other_attribute: {
            required: true
          }
        })
        class Model extends Backbone.Model {
          labels = {
            someAttribute: 'Custom label'
          }
        }
        this.model = new Model();        
      },

      afterEach: function () {
        // Reset to default formatter
        Backbone.Validation.options.labelFormatter = 'sentenceCase'        
      },

      "no formatting": {
        beforeEach: function () {
          Backbone.Validation.options.labelFormatter = 'none'          
        },

        "returns the attribute name": function () {
          assert.equals('someAttribute is required', this.model.preValidate('someAttribute', ''));
        }
      },

      "label formatting": {
        beforeEach: function () {
          Backbone.Validation.options.labelFormatter = 'label'
        },

        "looks up a label on the model": function () {
          assert.equals('Custom label is required', this.model.preValidate('someAttribute', ''));
        },

        "returns sentence cased name when label is not found": function () {
          assert.equals('Some attribute is required', this.model.preValidate('some_attribute', ''));
        },

        "returns sentence cased name when label attribute is not defined": function () {
          @validation({
            someAttribute: {
              required: true
            }
          })
          class Model extends Backbone.Model {
              set(...args) {
                super.set(...args)
                return this.validationError === null
              }
            }

          var model = new Model();          
          assert.equals('Some attribute is required', model.preValidate('someAttribute', ''));
        }
      },

      "sentence formatting": {
        beforeEach: function () {
          Backbone.Validation.options.labelFormatter = 'sentenceCase'          
        },

        "sentence cases camel cased attribute name": function () {
          assert.equals('Some attribute is required', this.model.preValidate('someAttribute', ''));
        },

        "sentence cases underscore named attribute name": function () {
          assert.equals('Some attribute is required', this.model.preValidate('some_attribute', ''));
        },

        "sentence cases underscore named attribute name with multiple underscores": function () {
          assert.equals('Some other attribute is required', this.model.preValidate('some_other_attribute', ''));
        }
      }
    }
  }
}
import {
  isString,
  isArray,
  isFunction,
  isObject,
  isBoolean,
  isNumber,
  isEmpty,
  result as getResult,
  reduce,
  each,
  includes,
  extend,
  pick
} from 'lodash-es';

/**
 * @import { Model } from './nextbone.js'
 */

/**
 * @callback FnRule
 * @param {*} value
 * @param {string} attr
 * @param {Record<string, any>} computed
 * @this { Model }
 *
 * @typedef {object} ValidationRule
 * @property {boolean|FnRule} [required] - If the attribute is required or not
 * @property {boolean|FnRule} [acceptance] - If the attribute has to be accepted
 * @property {number|FnRule} [min] - The minimum value for the attribute
 * @property {number|FnRule} [max] - The maximum value for the attribute
 * @property {number[]|FnRule} [range] - The range for the attribute]
 * @property {number|FnRule} [length] - The length for the attribute
 * @property {number|FnRule} [minLength] - The minimum length for the attribute
 * @property {number|FnRule} [maxLength] - The maximum length for the attribute
 * @property {number[]|FnRule} [rangeLength] - The range for the length of the attribute
 * @property {string[]|FnRule} [oneOf] - The allowed values for the attribute
 * @property {string|FnRule} [equalTo] - The name of the attribute to compare with
 * @property {RegExp|string|FnRule} [pattern] - The pattern to match the attribute against
 * @property {string} [msg] - The error message to display if the validation fails
 * @property {FnRule} [fn] - A custom function used for validation
 *
 * @typedef {Record<string, ValidationRule>} ValidationRules
 */

var keys = Object.keys;

// Default options
// ---------------

var options = {
  labelFormatter: 'sentenceCase',
  valid: Function.prototype,
  invalid: Function.prototype
};

// Helper functions
// ----------------

// Flattens an object
// eg:
//
//     var o = {
//       owner: {
//         name: 'Backbone',
//         address: {
//           street: 'Street',
//           zip: 1234
//         }
//       }
//     };
//
// becomes:
//
//     var o = {
//       'owner': {
//         name: 'Backbone',
//         address: {
//           street: 'Street',
//           zip: 1234
//         }
//       },
//       'owner.name': 'Backbone',
//       'owner.address': {
//         street: 'Street',
//         zip: 1234
//       },
//       'owner.address.street': 'Street',
//       'owner.address.zip': 1234
//     };
// This may seem redundant, but it allows for maximum flexibility
// in validation rules.

var flatten = function(obj, into, prefix) {
  into = into || {};
  prefix = prefix || '';

  each(obj, function(val, key) {
    if (obj.hasOwnProperty(key)) {
      if (!!val && typeof val === 'object' && val.constructor === Object) {
        flatten(val, into, prefix + key + '.');
      }

      // Register the current level object as well
      into[prefix + key] = val;
    }
  });

  return into;
};

// Determines whether or not a value is empty
var hasValue = function(value) {
  return !(
    value == null ||
    (isString(value) && value.trim() === '') ||
    (isArray(value) && value.length === 0)
  );
};

// Determines if two objects have at least on key in common
var hasCommonKeys = function(obj1, obj2) {
  for (let key in obj1) {
    if (key in obj2) return true;
  }
  return false;
};

// Returns an object with undefined properties for all
// attributes on the model that has defined one or more
// validation rules.
var getValidatedAttrs = function(attrs, rules) {
  attrs = attrs || keys(rules);
  return reduce(
    attrs,
    function(memo, key) {
      memo[key] = void 0;
      return memo;
    },
    {}
  );
};

// Looks on the model for validations for a specified
// attribute. Returns an array of any validators defined,
// or an empty array if none is defined.
var getValidators = function(attr, rules) {
  var attrValidationSet = rules[attr];

  // Stick the validator object into an array
  if (!isArray(attrValidationSet)) {
    attrValidationSet = [attrValidationSet];
  }

  // Reduces the array of validators into a new array with objects
  // with a validation method to call, the value to validate against
  // and the specified error message, if any
  return reduce(
    attrValidationSet,
    function(memo, attrValidation) {
      // If the validator is a function or a string, wrap it in a function validator
      if (isFunction(attrValidation) || isString(attrValidation)) {
        attrValidation = {
          fn: attrValidation
        };
      }

      attrValidation &&
        each(keys(attrValidation), function(validator) {
          if (validator === 'msg') return;
          memo.push({
            fn: validators[validator],
            val: attrValidation[validator],
            msg: attrValidation.msg
          });
        });
      return memo;
    },
    []
  );
};

// Validates an attribute against all validators defined
// for that attribute. If one or more errors are found,
// the first error message is returned.
// If the attribute is valid, an empty string is returned.
var validateAttr = function(model, attr, value, computed, rules) {
  // Reduces the array of validators to an error message by
  // applying all the validators and returning the first error
  // message, if any.
  return reduce(
    getValidators(attr, rules),
    function(memo, validator) {
      var result = validator.fn.call(validators, value, attr, validator.val, model, computed);

      if (result === false) {
        return false;
      }

      if (result && !memo) {
        return getResult(validator, 'msg') || result;
      }
      return memo;
    },
    ''
  );
};

// Loops through the model's attributes and validates the specified attrs.
// Returns and object containing names of invalid attributes
// as well as error messages.
var validateModel = function(model, allAttrs, validatedAttrs, rules) {
  var error,
    invalidAttrs = null;

  for (var attr in validatedAttrs) {
    error = validateAttr(model, attr, validatedAttrs[attr], allAttrs, rules);
    if (error) {
      invalidAttrs || (invalidAttrs = {});
      invalidAttrs[attr] = error;
    }
  }

  return invalidAttrs;
};

// Formatting functions used for formatting error messages

// Uses the configured label formatter to format the attribute name
// to make it more readable for the user
function formatLabel(attrName, model) {
  return labelFormatters[options.labelFormatter](attrName, model);
}

// Replaces numeric placeholders like {0} in a string with arguments
// passed to the function
function format(text, ...args) {
  return text.replace(/{(\d+)}/g, function(match, number) {
    return typeof args[number] !== 'undefined' ? args[number] : match;
  });
}

// Label formatters
// ----------------

// Label formatters are used to convert the attribute name
// to a more human friendly label when using the built in
// error messages.
// Configure which one to use with a call to
//
//     Backbone.Validation.configure({
//       labelFormatter: 'label'
//     });
var labelFormatters = {
  // Returns the attribute name with applying any formatting
  none: function(attrName) {
    return attrName;
  },

  // Converts attributeName or attribute_name to Attribute name
  sentenceCase: function(attrName) {
    return attrName
      .replace(/(?:^\w|[A-Z]|\b\w)/g, function(match, index) {
        return index === 0 ? match.toUpperCase() : ' ' + match.toLowerCase();
      })
      .replace(/_/g, ' ');
  },

  // Looks for a label configured on the model and returns it
  //
  //      var Model = class extends Model {
  //        static validation = {
  //          someAttribute: {
  //            required: true
  //          }
  //        }
  //
  //        labels = {
  //          someAttribute: 'Custom label'
  //        }
  //      };
  label: function(attrName, model) {
    return (
      (model.labels && model.labels[attrName]) || labelFormatters.sentenceCase(attrName, model)
    );
  }
};

// Patterns
// --------

var patterns = {
  // Matches any digit(s) (i.e. 0-9)
  digits: /^\d+$/,

  // Matches any number (e.g. 100.000)
  number: /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d*)?$/,

  // Matches a valid email address (e.g. mail@example.com)
  email: /^((([a-z]|\d|[\[\]()!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[\[\]()!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,

  // Mathes any valid url (e.g. http://www.xample.com)
  url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
};

// Error messages
// --------------

// Error message for the build in validators.
// {x} gets swapped out with arguments from the validator.
var messages = {
  required: '{0} is required',
  acceptance: '{0} must be accepted',
  min: '{0} must be greater than or equal to {1}',
  max: '{0} must be less than or equal to {1}',
  range: '{0} must be between {1} and {2}',
  length: '{0} must be {1} characters',
  minLength: '{0} must be at least {1} characters',
  maxLength: '{0} must be at most {1} characters',
  rangeLength: '{0} must be between {1} and {2} characters',
  oneOf: '{0} must be one of: {1}',
  equalTo: '{0} must be the same as {1}',
  digits: '{0} must only contain digits',
  number: '{0} must be a number',
  email: '{0} must be a valid email',
  url: '{0} must be a valid url',
  inlinePattern: '{0} is invalid'
};

// Built in validators
// -------------------

// Determines whether or not a value is a number
var isNumeric = function(value) {
  return isNumber(value) || (isString(value) && value.match(patterns.number));
};

var validators = {
  // Function validator
  // Lets you implement a custom function used for validation
  fn: function(value, attr, fn, model, computed) {
    if (isString(fn)) {
      fn = model[fn];
    }
    return fn.call(model, value, attr, computed);
  },

  // Required validator
  // Validates if the attribute is required or not
  // This can be specified as either a boolean value or a function that returns a boolean value
  required: function(value, attr, required, model, computed) {
    var isRequired = isFunction(required) ? required.call(model, value, attr, computed) : required;
    if (!isRequired && !hasValue(value)) {
      return false; // overrides all other validators
    }
    if (isRequired && !hasValue(value)) {
      return this.format(messages.required, this.formatLabel(attr, model));
    }
  },

  // Acceptance validator
  // Validates that something has to be accepted, e.g. terms of use
  // `true` or 'true' are valid
  acceptance: function(value, attr, accept, model) {
    if (value !== 'true' && (!isBoolean(value) || value === false)) {
      return this.format(messages.acceptance, this.formatLabel(attr, model));
    }
  },

  // Min validator
  // Validates that the value has to be a number and equal to or greater than
  // the min value specified
  min: function(value, attr, minValue, model) {
    if (!isNumeric(value) || value < minValue) {
      return this.format(messages.min, this.formatLabel(attr, model), minValue);
    }
  },

  // Max validator
  // Validates that the value has to be a number and equal to or less than
  // the max value specified
  max: function(value, attr, maxValue, model) {
    if (!isNumeric(value) || value > maxValue) {
      return this.format(messages.max, this.formatLabel(attr, model), maxValue);
    }
  },

  // Range validator
  // Validates that the value has to be a number and equal to or between
  // the two numbers specified
  range: function(value, attr, range, model) {
    if (!isNumeric(value) || value < range[0] || value > range[1]) {
      return this.format(messages.range, this.formatLabel(attr, model), range[0], range[1]);
    }
  },

  // Length validator
  // Validates that the value has to be a string with length equal to
  // the length value specified
  length: function(value, attr, length, model) {
    if (!isString(value) || value.length !== length) {
      return this.format(messages.length, this.formatLabel(attr, model), length);
    }
  },

  // Min length validator
  // Validates that the value has to be a string with length equal to or greater than
  // the min length value specified
  minLength: function(value, attr, minLength, model) {
    if (!isString(value) || value.length < minLength) {
      return this.format(messages.minLength, this.formatLabel(attr, model), minLength);
    }
  },

  // Max length validator
  // Validates that the value has to be a string with length equal to or less than
  // the max length value specified
  maxLength: function(value, attr, maxLength, model) {
    if (!isString(value) || value.length > maxLength) {
      return this.format(messages.maxLength, this.formatLabel(attr, model), maxLength);
    }
  },

  // Range length validator
  // Validates that the value has to be a string and equal to or between
  // the two numbers specified
  rangeLength: function(value, attr, range, model) {
    if (!isString(value) || value.length < range[0] || value.length > range[1]) {
      return this.format(messages.rangeLength, this.formatLabel(attr, model), range[0], range[1]);
    }
  },

  // One of validator
  // Validates that the value has to be equal to one of the elements in
  // the specified array. Case sensitive matching
  oneOf: function(value, attr, values, model) {
    if (!includes(values, value)) {
      return this.format(messages.oneOf, this.formatLabel(attr, model), values.join(', '));
    }
  },

  // Equal to validator
  // Validates that the value has to be equal to the value of the attribute
  // with the name specified
  equalTo: function(value, attr, equalTo, model, computed) {
    if (value !== computed[equalTo]) {
      return this.format(
        messages.equalTo,
        this.formatLabel(attr, model),
        this.formatLabel(equalTo, model)
      );
    }
  },

  // Pattern validator
  // Validates that the value has to match the pattern specified.
  // Can be a regular expression or the name of one of the built in patterns
  pattern: function(value, attr, pattern, model) {
    if (!hasValue(value) || !value.toString().match(patterns[pattern] || pattern)) {
      return this.format(
        messages[pattern] || messages.inlinePattern,
        this.formatLabel(attr, model),
        pattern
      );
    }
  }
};

// Set helper functions using Object.defineProperty (non writable, configurable or enumerable)
Object.defineProperty(validators, 'format', { value: format });
Object.defineProperty(validators, 'formatLabel', { value: formatLabel });

const getRules = ctor => {
  if (ctor.hasOwnProperty('__validationRules')) {
    return ctor.__validationRules;
  }
  return (ctor.__validationRules = ctor.validation);
};

/**
 * @template {typeof Model} ModelClass
 * @param {ModelClass} ModelClass
 * @returns
 */
function createClass(ModelClass) {
  return class extends ModelClass {
    /**
     * @description Check whether or not a value, or a hash of values passes validation without updating the model
     * @param {string} attr
     * @param {*} value
     * @returns
     */
    preValidate(attr, value) {
      var rules = getRules(this.constructor);
      if (!rules) return;
      var self = this,
        result = {},
        error,
        allAttrs = extend({}, this.attributes);

      if (isObject(attr)) {
        // if multiple attributes are passed at once we would like for the validation functions to
        // have access to the fresh values sent for all attributes, in the same way they do in the
        // regular validation
        extend(allAttrs, attr);

        each(attr, function(attrValue, attrKey) {
          error = validateAttr(self, attrKey, attrValue, allAttrs, rules);
          if (error) {
            result[attrKey] = error;
          }
        });

        return isEmpty(result) ? undefined : result;
      }
      return validateAttr(self, attr, value, allAttrs, rules);
    }

    // Check to see if an attribute, an array of attributes or the
    // entire model is valid.
    isValid(opts) {
      var attributes;

      if (isString(opts)) {
        attributes = [opts];
      } else if (isArray(opts)) {
        attributes = opts;
      }

      var error = (this.validationError =
        this.validate(null, { validate: true, attributes }) || null);
      if (!error) return true;
      this.trigger('invalid', this, error, opts);
      return false;
    }

    // This is called by Backbone when it needs to perform validation.
    // You can call it manually without any parameters to validate the
    // entire model.
    validate(attrs, setOptions) {
      var rules = getRules(this.constructor);
      if (!rules) return;
      var model = this,
        validateAll = !attrs,
        opt = extend({}, options, setOptions),
        validatedAttrs = getValidatedAttrs(opt.attributes, rules),
        allAttrs = extend({}, validatedAttrs, model.attributes, attrs),
        flattened = flatten(allAttrs),
        changedAttrs = attrs ? flatten(attrs) : flattened,
        invalidAttrs = validateModel(model, allAttrs, pick(flattened, keys(validatedAttrs)), rules);

      // After validation is performed, loop through all validated and changed attributes
      // and call the valid and invalid callbacks so the view is updated.
      each(validatedAttrs, function(val, attr) {
        var invalid = invalidAttrs && attr in invalidAttrs,
          changed = attr in changedAttrs;

        if (!invalid) {
          opt.valid(attr, model);
        }
        if (invalid && (changed || validateAll)) {
          opt.invalid(attr, invalidAttrs[attr], model);
        }
      });

      // Trigger validated events.
      // Need to defer this so the model is actually updated before
      // the event is triggered.

      model.trigger('validated', model, invalidAttrs, setOptions);

      // Return any error messages to Nextbone.
      if (invalidAttrs && hasCommonKeys(invalidAttrs, changedAttrs)) {
        return invalidAttrs;
      }
    }
  };
}

// decorator
// todo add type for functions
/**
 * @typedef ValidationStaticMixin
 * @property {ValidationRules} validation
 */

/**
 * @template {typeof Model} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & ValidationStaticMixin}
 */
const withValidation = ctorOrDescriptor => {
  if (typeof ctorOrDescriptor === 'function') {
    return createClass(ctorOrDescriptor);
  }
  const { kind, elements } = ctorOrDescriptor;
  return {
    kind,
    elements,
    finisher(ctor) {
      return createClass(ctor);
    }
  };
};

export { withValidation, labelFormatters, messages, validators, patterns, options };

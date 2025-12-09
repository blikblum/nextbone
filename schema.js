import { isString, isArray, isObject, isEmpty, extend, pick, each, keys } from 'lodash-es';

/**
 * @import { Model } from './nextbone.js'
 * @import { z } from 'zod'
 */

/**
 * @template T
 * @typedef {new (...args: any[]) => T} Ctor
 */

/**
 * @typedef {z.ZodObject<any>} ZodSchema
 */

// Default options
// ---------------

var defaultOptions = {
  valid: Function.prototype,
  invalid: Function.prototype,
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

var flatten = function (obj, into, prefix) {
  into = into || {};
  prefix = prefix || '';

  each(obj, function (val, key) {
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

// Determines if two objects have at least one key in common
var hasCommonKeys = function (obj1, obj2) {
  for (let key in obj1) {
    if (key in obj2) return true;
  }
  return false;
};

// Returns an object with undefined properties for all
// attributes that have defined schema validation.
var getValidatedAttrs = function (attrs, schema) {
  const schemaKeys = Object.keys(schema.shape || {});
  attrs = attrs || schemaKeys;
  return attrs.reduce(function (memo, key) {
    memo[key] = void 0;
    return memo;
  }, {});
};

// Formats Zod error messages into a flat object keyed by attribute name
var formatZodErrors = function (zodError) {
  if (!zodError || !zodError.issues) return null;

  var errors = {};
  zodError.issues.forEach(function (issue) {
    // Get the path to the error (e.g., ['name'] or ['address', 'street'])
    var path = issue.path.length > 0 ? issue.path.join('.') : '_root';
    // Only store the first error for each path
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return isEmpty(errors) ? null : errors;
};

// Validates attributes using the Zod schema
var validateWithSchema = function (model, attrs, schema) {
  const result = schema.safeParse(attrs);
  if (result.success) {
    return null;
  }
  return formatZodErrors(result.error);
};

// Validates a specific attribute using the Zod schema
var validateAttr = function (model, attr, value, allAttrs, schema) {
  // Create an object with just the attribute to validate
  const shape = schema.shape || {};

  // Check if the attribute is in the schema
  if (!shape[attr]) {
    return '';
  }

  // Validate just this attribute
  const result = shape[attr].safeParse(value);
  if (result.success) {
    return '';
  }

  // Return the first error message
  return result.error.issues[0]?.message || 'Invalid value';
};

// Loops through the model's attributes and validates the specified attrs.
// Returns an object containing names of invalid attributes and error messages.
var validateModel = function (model, allAttrs, validatedAttrs, schema) {
  var error,
    invalidAttrs = null;

  for (var attr in validatedAttrs) {
    error = validateAttr(model, attr, validatedAttrs[attr], allAttrs, schema);
    if (error) {
      invalidAttrs || (invalidAttrs = {});
      invalidAttrs[attr] = error;
    }
  }

  return invalidAttrs;
};

const getSchema = (ctor) => {
  if (ctor.hasOwnProperty('__schemaInstance')) {
    return ctor.__schemaInstance;
  }
  return (ctor.__schemaInstance = ctor.schema);
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
     * @param {string|Object} attr - Attribute name or object with attributes
     * @param {*} [value] - Value to validate (if attr is a string)
     * @returns {string|Object|undefined} - Error message(s) if invalid, undefined if valid
     */
    preValidate(attr, value) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      var self = this,
        result = {},
        error,
        allAttrs = extend({}, this.attributes);

      if (isObject(attr)) {
        // If multiple attributes are passed at once we would like for the validation functions to
        // have access to the fresh values sent for all attributes, in the same way they do in the
        // regular validation
        extend(allAttrs, attr);

        each(attr, function (attrValue, attrKey) {
          error = validateAttr(self, attrKey, attrValue, allAttrs, schema);
          if (error) {
            result[attrKey] = error;
          }
        });

        return isEmpty(result) ? undefined : result;
      }
      return validateAttr(self, attr, value, allAttrs, schema);
    }

    /**
     * Check to see if an attribute, an array of attributes or the
     * entire model is valid.
     * @param {string|string[]|Object} [opts] - Attribute name, array of names, or options
     * @returns {boolean}
     */
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

    /**
     * This is called by Backbone when it needs to perform validation.
     * You can call it manually without any parameters to validate the
     * entire model.
     * @param {Object|null} [attrs] - Attributes to validate
     * @param {Object} [setOptions] - Options
     * @returns {Object|undefined} - Validation errors if invalid, undefined if valid
     */
    validate(attrs, setOptions) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      var model = this,
        validateAll = !attrs,
        opt = extend({}, defaultOptions, setOptions),
        schemaKeys = Object.keys(schema.shape || {}),
        validatedAttrs = getValidatedAttrs(opt.attributes, schema),
        allAttrs = extend({}, validatedAttrs, model.attributes, attrs),
        flattened = flatten(allAttrs),
        changedAttrs = attrs ? flatten(attrs) : flattened,
        invalidAttrs = validateModel(model, allAttrs, pick(flattened, keys(validatedAttrs)), schema);

      // After validation is performed, loop through all validated and changed attributes
      // and call the valid and invalid callbacks so the view is updated.
      each(validatedAttrs, function (val, attr) {
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
      model.trigger('validated', model, invalidAttrs, setOptions);

      // Return any error messages to Nextbone.
      if (invalidAttrs && hasCommonKeys(invalidAttrs, changedAttrs)) {
        return invalidAttrs;
      }
    }
  };
}

// decorator
/**
 * @typedef SchemaStaticMixin
 * @property {ZodSchema} schema
 */

/**
 * A mixin/decorator that adds Zod schema-based validation to a Model class.
 * The schema should be defined as a static `schema` property on the Model class.
 *
 * @example
 * // Function style
 * class UserModel extends withSchema(Model) {
 *   static schema = z.object({
 *     name: z.string().min(1, 'Name is required'),
 *     email: z.string().email('Invalid email'),
 *     age: z.number().min(0).optional(),
 *   });
 * }
 *
 * @example
 * // Decorator style
 * @withSchema
 * class UserModel extends Model {
 *   static schema = z.object({
 *     name: z.string().min(1, 'Name is required'),
 *     email: z.string().email('Invalid email'),
 *   });
 * }
 *
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & SchemaStaticMixin}
 */
const withSchema = (ctorOrDescriptor) => {
  if (typeof ctorOrDescriptor === 'function') {
    return createClass(ctorOrDescriptor);
  }
  const { kind, elements } = ctorOrDescriptor;
  return {
    kind,
    elements,
    finisher(ctor) {
      return createClass(ctor);
    },
  };
};

export { withSchema, defaultOptions };

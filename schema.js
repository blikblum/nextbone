import { isString, isArray, isObject, isEmpty, each, keys } from 'lodash-es';

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

var isPlainObject = function (value) {
  return !!value && typeof value === 'object' && value.constructor === Object;
};

var flatten = function (obj, into, prefix) {
  into = into || {};
  prefix = prefix || '';

  each(obj, function (val, key) {
    if (obj.hasOwnProperty(key)) {
      if (isPlainObject(val)) {
        flatten(val, into, prefix + key + '.');
      }

      // Register the current level object as well
      into[prefix + key] = val;
    }
  });

  return into;
};

var unwrapSchema = function (schema) {
  var currentSchema = schema;

  while (currentSchema && typeof currentSchema.unwrap === 'function') {
    currentSchema = currentSchema.unwrap();
  }

  return currentSchema;
};

var getSchemaShape = function (schema) {
  return unwrapSchema(schema)?.shape;
};

var getSchemaLeafPaths = function (schema, prefix, into) {
  prefix = prefix || '';
  into = into || [];

  var shape = getSchemaShape(schema);
  if (!shape) {
    prefix && into.push(prefix);
    return into;
  }

  each(shape, function (fieldSchema, key) {
    var path = prefix ? prefix + '.' + key : key;
    getSchemaLeafPaths(fieldSchema, path, into);
  });

  return into;
};

var matchesPath = function (path, candidate) {
  return path === candidate || path.startsWith(candidate + '.') || candidate.startsWith(path + '.');
};

var hasMatchingPath = function (paths, path) {
  for (var index = 0; index < paths.length; index++) {
    if (matchesPath(path, paths[index])) {
      return true;
    }
  }

  return false;
};

var hasCommonPaths = function (paths1, paths2) {
  for (var index = 0; index < paths1.length; index++) {
    if (hasMatchingPath(paths2, paths1[index])) {
      return true;
    }
  }

  return false;
};

var getAffectedSchemaPaths = function (schema, paths) {
  var leafPaths = getSchemaLeafPaths(schema);

  return leafPaths.filter(function (leafPath) {
    return hasMatchingPath(paths, leafPath);
  });
};

var setPathValue = function (obj, path, value) {
  var parts = path.split('.');
  var current = obj;

  for (var index = 0; index < parts.length - 1; index++) {
    var part = parts[index];
    if (!isPlainObject(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
  return obj;
};

var ensurePath = function (obj, path) {
  var parts = path.split('.');
  var current = obj;

  for (var index = 0; index < parts.length - 1; index++) {
    var part = parts[index];
    if (!isPlainObject(current[part])) {
      current[part] = {};
    }
    current = current[part];
  }

  var leafKey = parts[parts.length - 1];
  if (!Object.prototype.hasOwnProperty.call(current, leafKey)) {
    current[leafKey] = void 0;
  }

  return obj;
};

var mergeNestedAttrs = function (target, source) {
  if (!isPlainObject(source)) {
    return target;
  }

  each(source, function (value, key) {
    if (isPlainObject(value)) {
      var base = isPlainObject(target[key]) ? target[key] : {};
      target[key] = mergeNestedAttrs(base, value);
      return;
    }

    target[key] = value;
  });

  return target;
};

var buildValidationAttrs = function (currentAttrs, attrs, paths) {
  var allAttrs = mergeNestedAttrs({}, currentAttrs || {});

  each(paths, function (path) {
    ensurePath(allAttrs, path);
  });

  mergeNestedAttrs(allAttrs, attrs);

  return allAttrs;
};

var toValidatedAttrs = function (paths) {
  return paths.reduce(function (memo, key) {
    memo[key] = void 0;
    return memo;
  }, {});
};

// Returns an object with undefined properties for all
// attributes that have defined schema validation.
var getValidatedAttrs = function (attrs, schema) {
  var schemaKeys = Object.keys(getSchemaShape(schema) || {});
  var paths = attrs ? getAffectedSchemaPaths(schema, attrs) : schemaKeys;

  return toValidatedAttrs(paths);
};

var getChangedValidatedAttrs = function (attrs, schema) {
  return toValidatedAttrs(getAffectedSchemaPaths(schema, Object.keys(flatten(attrs || {}))));
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

var collectRequestedErrors = function (errors, paths) {
  if (!errors) return null;

  var errorPaths = keys(errors);
  var invalidAttrs = paths.reduce(function (memo, path) {
    var matchingPath = errorPaths.find(function (errorPath) {
      return matchesPath(path, errorPath);
    });

    if (matchingPath) {
      memo[path] = errors[matchingPath];
    }

    return memo;
  }, {});

  return isEmpty(invalidAttrs) ? null : invalidAttrs;
};

// Validates attributes using the Zod schema
var validateWithSchema = function (attrs, schema) {
  const result = schema.safeParse(attrs);
  if (result.success) {
    return null;
  }
  return formatZodErrors(result.error);
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

      if (isObject(attr)) {
        var validatedAttrs = getChangedValidatedAttrs(attr, schema);
        var validatedPaths = keys(validatedAttrs);
        if (!validatedPaths.length) {
          return undefined;
        }

        var allAttrs = buildValidationAttrs(this.attributes, attr, validatedPaths);
        var errors = validateWithSchema(allAttrs, schema);
        return collectRequestedErrors(errors, validatedPaths) || undefined;
      }

      var requestedPaths = getAffectedSchemaPaths(schema, [attr]);
      if (!requestedPaths.length) {
        return '';
      }

      var validationAttrs = buildValidationAttrs(this.attributes, null, requestedPaths);
      setPathValue(validationAttrs, attr, value);

      return (
        collectRequestedErrors(validateWithSchema(validationAttrs, schema), [attr])?.[attr] || ''
      );
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
     * @param {Object} [options] - Options
     * @returns {Object|undefined} - Validation errors if invalid, undefined if valid
     */
    validate(attrs, options = {}) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      var model = this,
        validateAll = !attrs,
        validatedAttrs = options.attributes
          ? getValidatedAttrs(options.attributes, schema)
          : attrs
            ? getChangedValidatedAttrs(attrs, schema)
            : getValidatedAttrs(undefined, schema),
        validatedPaths = keys(validatedAttrs),
        allAttrs = buildValidationAttrs(model.attributes, attrs, validatedPaths),
        changedPaths = keys(attrs ? flatten(attrs) : flatten(allAttrs)),
        invalidAttrs = collectRequestedErrors(validateWithSchema(allAttrs, schema), validatedPaths);

      // After validation is performed, loop through all validated and changed attributes
      // and call the valid and invalid callbacks so the view is updated.
      if (options.valid || options.invalid) {
        each(validatedAttrs, function (val, attr) {
          var invalid = invalidAttrs && attr in invalidAttrs,
            changed = hasMatchingPath(changedPaths, attr);

          if (!invalid) {
            options.valid?.(attr, model);
          }
          if (invalid && (changed || validateAll)) {
            options.invalid?.(attr, invalidAttrs[attr], model);
          }
        });
      }

      // Trigger validated events.
      model.trigger('validated', model, invalidAttrs, options);

      // Return any error messages to Nextbone.
      if (invalidAttrs && hasCommonPaths(keys(invalidAttrs), changedPaths)) {
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

export { withSchema };

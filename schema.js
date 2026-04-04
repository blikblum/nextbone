import { isString, isArray, isObject, isPlainObject, each, keys } from 'lodash-es';

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

/**
 * @typedef {Record<string, any>} AttributesMap
 */

/**
 * @typedef {string[]} PathList
 */

/**
 * @typedef {Record<string, z.ZodTypeAny>} SchemaShape
 */

/**
 * @typedef {Record<string, string>} ValidationErrorMap
 */

/**
 * @callback ValidCallback
 * @param {string} attr
 * @param {Model} model
 * @returns {void}
 */

/**
 * @callback InvalidCallback
 * @param {string} attr
 * @param {string} message
 * @param {Model} model
 * @returns {void}
 */

/**
 * @typedef {object} ValidationOptions
 * @property {boolean} [validate]
 * @property {PathList} [attributes]
 * @property {ValidCallback} [valid]
 * @property {InvalidCallback} [invalid]
 */

// Helper functions
// ----------------

// Flattens an object into dot-separated paths
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
//     var paths = [
//       'owner.name',
//       'owner.address.street',
//       'owner.address.zip',
//       'owner.address',
//       'owner'
//     ];

/**
 * @param {AttributesMap} obj
 * @param {PathList} [into]
 * @param {string} [prefix]
 * @returns {PathList}
 */
var flattenObjectPaths = function (obj, into, prefix) {
  into = into || [];
  prefix = prefix || '';

  each(obj, function (val, key) {
    if (obj.hasOwnProperty(key)) {
      if (isPlainObject(val)) {
        flattenObjectPaths(val, into, prefix + key + '.');
      }

      into.push(prefix + key);
    }
  });

  return into;
};

/**
 * @param {z.ZodTypeAny} schema
 * @returns {z.ZodTypeAny}
 */
var unwrapSchema = function (schema) {
  var currentSchema = schema;

  while (currentSchema && typeof currentSchema.unwrap === 'function') {
    currentSchema = currentSchema.unwrap();
  }

  return currentSchema;
};

/**
 * @param {z.ZodTypeAny} schema
 * @returns {SchemaShape|undefined}
 */
var getSchemaShape = function (schema) {
  return unwrapSchema(schema)?.shape;
};

/**
 * @param {z.ZodTypeAny} schema
 * @param {string} [prefix]
 * @param {PathList} [into]
 * @returns {PathList}
 */
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

/**
 * @param {string} path
 * @param {string} candidate
 * @returns {boolean}
 */
var matchesPath = function (path, candidate) {
  return path === candidate || path.startsWith(candidate + '.') || candidate.startsWith(path + '.');
};

/**
 * @param {PathList} paths
 * @param {string} path
 * @returns {boolean}
 */
var hasMatchingPath = function (paths, path) {
  for (var index = 0; index < paths.length; index++) {
    if (matchesPath(path, paths[index])) {
      return true;
    }
  }

  return false;
};

/**
 * @param {PathList} paths1
 * @param {PathList} paths2
 * @returns {boolean}
 */
var hasCommonPaths = function (paths1, paths2) {
  for (var index = 0; index < paths1.length; index++) {
    if (hasMatchingPath(paths2, paths1[index])) {
      return true;
    }
  }

  return false;
};

/**
 * @param {z.ZodTypeAny} schema
 * @param {PathList} paths
 * @returns {PathList}
 */
var getAffectedSchemaPaths = function (schema, paths) {
  var leafPaths = getSchemaLeafPaths(schema);

  return leafPaths.filter(function (leafPath) {
    return hasMatchingPath(paths, leafPath);
  });
};

/**
 * @param {AttributesMap} obj
 * @param {string} path
 * @param {*} value
 * @returns {AttributesMap}
 */
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

/**
 * @param {AttributesMap} target
 * @param {AttributesMap|undefined|null} source
 * @returns {AttributesMap}
 */
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

/**
 * @param {AttributesMap} currentAttrs
 * @param {AttributesMap|undefined} attrs
 * @returns {AttributesMap}
 */
var buildValidationAttrs = function (currentAttrs, attrs) {
  var allAttrs = mergeNestedAttrs({}, currentAttrs);

  mergeNestedAttrs(allAttrs, attrs);

  return allAttrs;
};

// Returns the attributes that have defined schema validation.
/**
 * @param {PathList|undefined} attrs
 * @param {ZodSchema} schema
 * @returns {PathList}
 */
var getValidatedPaths = function (attrs, schema) {
  return attrs ? getAffectedSchemaPaths(schema, attrs) : keys(getSchemaShape(schema) || {});
};

/**
 * @param {z.ZodError} zodError
 * @returns {ValidationErrorMap|undefined}
 */
// Formats Zod error messages into a flat object keyed by attribute name
var formatZodErrors = function (zodError) {
  if (zodError.issues.length === 0) return;

  var errors = {};
  zodError.issues.forEach(function (issue) {
    // Get the path to the error (e.g., ['name'] or ['address', 'street'])
    var path = issue.path.length > 0 ? issue.path.join('.') : '_root';
    // Only store the first error for each path
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  });

  return errors;
};

/**
 * @param {ValidationErrorMap|undefined} errors
 * @param {PathList} paths
 * @returns {ValidationErrorMap|undefined}
 */
var collectRequestedErrors = function (errors, paths) {
  if (!errors) return;

  var errorPaths = keys(errors);
  var invalidAttrs;
  paths.forEach(function (path) {
    var matchingPath = errorPaths.find(function (errorPath) {
      return matchesPath(path, errorPath);
    });

    if (matchingPath) {
      invalidAttrs = invalidAttrs || {};
      invalidAttrs[path] = errors[matchingPath];
    }
  });

  return invalidAttrs;
};

// Validates attributes using the Zod schema
/**
 * @param {AttributesMap} attrs
 * @param {ZodSchema} schema
 * @returns {ValidationErrorMap|undefined}
 */
var validateWithSchema = function (attrs, schema) {
  const result = schema.safeParse(attrs);
  if (result.success) {
    return;
  }
  return formatZodErrors(result.error);
};

/**
 * @param {{ __schemaInstance?: ZodSchema, schema?: ZodSchema }} ctor
 * @returns {ZodSchema|undefined}
 */
const getSchema = (ctor) => {
  if (ctor.hasOwnProperty('__schemaInstance')) {
    return ctor.__schemaInstance;
  }
  return (ctor.__schemaInstance = ctor.schema);
};

/**
 * @template {typeof Model} ModelClass
 * @param {ModelClass} ModelClass
 * @returns {ModelClass}
 */
function createClass(ModelClass) {
  return class extends ModelClass {
    /**
     * @description Check whether or not a value, or a hash of values passes validation without updating the model
     * @param {string|AttributesMap} attr - Attribute name or object with attributes
     * @param {*} [value] - Value to validate (if attr is a string)
     * @returns {string|ValidationErrorMap|undefined} - Error message(s) if invalid, undefined if valid
     */
    preValidate(attr, value) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      if (isObject(attr)) {
        var validatedPaths = getAffectedSchemaPaths(schema, flattenObjectPaths(attr));
        if (!validatedPaths.length) {
          return;
        }

        var allAttrs = buildValidationAttrs(this.attributes, attr);
        var errors = validateWithSchema(allAttrs, schema);
        return collectRequestedErrors(errors, validatedPaths);
      }

      // todo: verify if checking for affected paths is necessary here.
      // commenting do not break tests, but may be a lack of coverage for this code path.
      var requestedPaths = getAffectedSchemaPaths(schema, [attr]);
      if (!requestedPaths.length) {
        return '';
      }

      var validationAttrs = buildValidationAttrs(this.attributes);
      setPathValue(validationAttrs, attr, value);

      return (
        collectRequestedErrors(validateWithSchema(validationAttrs, schema), [attr])?.[attr] || ''
      );
    }

    /**
     * Check to see if an attribute, an array of attributes or the
     * entire model is valid.
     * @param {string|PathList|ValidationOptions} [opts] - Attribute name, array of names, or options
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
     * This is called by Nextbone when it needs to perform validation.
     * You can call it manually without any parameters to validate the
     * entire model.
     * @param {AttributesMap|null} [attrs] - Attributes to validate
     * @param {ValidationOptions} [options] - Options
     * @returns {ValidationErrorMap|undefined} - Validation errors if invalid, undefined if valid
     */
    validate(attrs, options = {}) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      var model = this,
        validatedPaths = options.attributes
          ? getValidatedPaths(options.attributes, schema)
          : attrs
            ? getAffectedSchemaPaths(schema, flattenObjectPaths(attrs))
            : getValidatedPaths(undefined, schema),
        allAttrs = buildValidationAttrs(model.attributes, attrs),
        changedPaths = attrs ? flattenObjectPaths(attrs) : flattenObjectPaths(allAttrs),
        invalidAttrs = collectRequestedErrors(validateWithSchema(allAttrs, schema), validatedPaths);

      // After validation is performed, loop through all validated and changed attributes
      // and call the valid and invalid callbacks so the view is updated.
      if (options.valid || options.invalid) {
        each(validatedPaths, function (attr) {
          var invalid = invalidAttrs && attr in invalidAttrs,
            changed = hasMatchingPath(changedPaths, attr);

          if (!invalid) {
            options.valid?.(attr, model);
          }
          if (invalid && (changed || !attrs)) {
            options.invalid?.(attr, invalidAttrs[attr], model);
          }
        });
      }

      // Trigger validated events.
      model.trigger('validated', model, invalidAttrs, options);

      // Return any error messages to Nextbone.
      if (invalidAttrs && hasCommonPaths(keys(invalidAttrs), validatedPaths)) {
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

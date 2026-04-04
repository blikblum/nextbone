import { isString, isArray, isObject, isEmpty, extend, each } from 'lodash-es';

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

var hasOwn = Object.prototype.hasOwnProperty;

var isPlainObject = function (value) {
  return !!value && typeof value === 'object' && value.constructor === Object;
};

var getPathParts = function (path) {
  return path.split('.');
};

var isIndexPathPart = function (part) {
  for (var i = 0; i < part.length; i++) {
    var c = part.charCodeAt(i);
    if (c < 48 || c > 57) return false;
  }
  return part.length > 0;
};

var areRelatedPaths = function (path1, path2) {
  if (path1 === '_root' || path2 === '_root') return true;
  return path1 === path2 || path1.startsWith(path2 + '.') || path2.startsWith(path1 + '.');
};

var getDefaultAttrs = function (paths, schema) {
  var topLevelKeys = paths
    ? Array.from(
        new Set(
          paths.map(function (path) {
            return getPathParts(path)[0];
          }),
        ),
      )
    : Object.keys(schema.shape || {});

  return topLevelKeys.reduce(function (memo, key) {
    memo[key] = void 0;
    return memo;
  }, {});
};

var cloneValue = function (value) {
  if (isArray(value)) {
    return value.map(cloneValue);
  }

  if (isPlainObject(value)) {
    return Object.keys(value).reduce(function (memo, key) {
      memo[key] = cloneValue(value[key]);
      return memo;
    }, {});
  }

  return value;
};

var collectLeafPaths = function (value, prefix, into) {
  into = into || [];
  prefix = prefix || '';

  if (isArray(value)) {
    if (value.length === 0) {
      prefix && into.push(prefix);
      return into;
    }

    value.forEach(function (item, index) {
      collectLeafPaths(item, prefix ? prefix + '.' + index : String(index), into);
    });
    return into;
  }

  if (isPlainObject(value)) {
    var hasChildren = false;

    each(value, function (item, key) {
      if (!hasOwn.call(value, key)) return;
      hasChildren = true;
      collectLeafPaths(item, prefix ? prefix + '.' + key : key, into);
    });

    if (!hasChildren && prefix) {
      into.push(prefix);
    }

    return into;
  }

  prefix && into.push(prefix);
  return into;
};

var unwrapSchema = function (schema) {
  var current = schema;

  while (current && !current.shape && !current.element && typeof current.unwrap === 'function') {
    current = current.unwrap();
  }

  return current;
};

var getSchemaAtPath = function (schema, path) {
  var current = schema;
  var parts = getPathParts(path);

  for (var i = 0; i < parts.length; i++) {
    current = unwrapSchema(current);
    if (!current) return;

    var part = parts[i];

    if (current.shape) {
      current = current.shape[part];
      continue;
    }

    if (current.element && isIndexPathPart(part)) {
      current = current.element;
      continue;
    }

    return;
  }

  return unwrapSchema(current);
};

var isSchemaPath = function (schema, path) {
  return !!getSchemaAtPath(schema, path);
};

var setPathValue = function (obj, path, value) {
  var parts = getPathParts(path);
  var target = obj;

  for (var i = 0; i < parts.length - 1; i++) {
    var part = parts[i];
    var nextPart = parts[i + 1];

    if (!isObject(target[part])) {
      target[part] = isIndexPathPart(nextPart) ? [] : {};
    }

    target = target[part];
  }

  target[parts[parts.length - 1]] = value;
  return obj;
};

var getChangedPaths = function (model, attrs) {
  var changedAttrs = model.changedAttributes(attrs) || {};
  return collectLeafPaths(changedAttrs);
};

var getValidationPaths = function (model, attrs, requestedPaths, schema) {
  if (requestedPaths && requestedPaths.length) {
    return requestedPaths.slice();
  }

  if (!attrs) {
    return Object.keys(schema.shape || {});
  }

  return getChangedPaths(model, attrs);
};

var pickMatchingErrors = function (errors, paths) {
  if (!errors) return null;
  if (!paths || !paths.length) return errors;

  var matchedErrors = {};

  each(errors, function (message, path) {
    for (var i = 0; i < paths.length; i++) {
      if (areRelatedPaths(paths[i], path)) {
        matchedErrors[path] = message;
        return;
      }
    }
  });

  return isEmpty(matchedErrors) ? null : matchedErrors;
};

var getMatchingError = function (errors, path) {
  if (!errors) return '';

  if (hasOwn.call(errors, path)) {
    return errors[path];
  }

  // Single pass: prefer child errors (more specific) over parent errors
  var childMatch = '';
  var parentMatch = '';
  var pathDot = path + '.';

  for (var errorPath in errors) {
    if (!childMatch && errorPath.startsWith(pathDot)) {
      childMatch = errors[errorPath];
    } else if (!parentMatch && path.startsWith(errorPath + '.')) {
      parentMatch = errors[errorPath];
    }
    if (childMatch) break;
  }

  return childMatch || parentMatch || '';
};

var hasMatchingPaths = function (errors, paths) {
  if (!errors || !paths || !paths.length) return false;

  for (var errorPath in errors) {
    for (var i = 0; i < paths.length; i++) {
      if (areRelatedPaths(paths[i], errorPath)) {
        return true;
      }
    }
  }

  return false;
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

// Returns true if a schema is a simple ZodObject with no object-level checks/refinements.
// When true, individual top-level fields can be validated in isolation.
var isSimpleObjectSchema = function (schema) {
  var def = schema && schema._def;
  return !!def && !!def.shape && (!def.checks || def.checks.length === 0);
};

// Fast-path: validates a single top-level attribute against its field schema.
// Only safe when the schema has no object-level checks (refinements, superRefine, etc).
var validateAttrFast = function (attr, value, schema) {
  var shape = schema.shape;
  if (!shape || !shape[attr]) return '';

  var result = shape[attr].safeParse(value);
  if (result.success) return '';

  return result.error.issues[0]?.message || 'Invalid value';
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

      var allAttrs;

      if (isObject(attr)) {
        // Fast path: all keys are top-level and schema has no cross-field checks
        var attrPaths = Object.keys(attr);
        var canFastPath = isSimpleObjectSchema(schema);

        if (canFastPath) {
          var allTopLevel = true;
          for (var i = 0; i < attrPaths.length; i++) {
            if (attrPaths[i].includes('.')) {
              allTopLevel = false;
              break;
            }
          }

          if (allTopLevel) {
            var result = {};
            var hasError = false;
            each(attr, function (attrValue, attrKey) {
              var error = validateAttrFast(attrKey, attrValue, schema);
              if (error) {
                result[attrKey] = error;
                hasError = true;
              }
            });
            return hasError ? result : undefined;
          }
        }

        allAttrs = cloneValue(extend({}, getDefaultAttrs(attrPaths, schema), this.attributes));

        each(attr, function (attrValue, attrKey) {
          if (attrKey.includes('.')) {
            setPathValue(allAttrs, attrKey, cloneValue(attrValue));
          } else {
            allAttrs[attrKey] = cloneValue(attrValue);
          }
        });

        var invalidAttrs = pickMatchingErrors(validateWithSchema(allAttrs, schema), attrPaths);

        return invalidAttrs || undefined;
      }

      if (!isSchemaPath(schema, attr)) {
        return '';
      }

      // Fast path: top-level attribute on schema without cross-field checks
      if (!attr.includes('.') && isSimpleObjectSchema(schema)) {
        return validateAttrFast(attr, value, schema);
      }

      allAttrs = cloneValue(extend({}, getDefaultAttrs([attr], schema), this.attributes));

      if (attr.includes('.')) {
        setPathValue(allAttrs, attr, cloneValue(value));
      } else {
        allAttrs[attr] = cloneValue(value);
      }

      return getMatchingError(
        pickMatchingErrors(validateWithSchema(allAttrs, schema), [attr]),
        attr,
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
     * @param {Object} [setOptions] - Options
     * @returns {Object|undefined} - Validation errors if invalid, undefined if valid
     */
    validate(attrs, setOptions) {
      var schema = getSchema(this.constructor);
      if (!schema) return;

      var model = this,
        validateAll = !attrs,
        opt = extend({}, defaultOptions, setOptions),
        requestedPaths = getValidationPaths(model, attrs, opt.attributes, schema),
        allAttrs = extend({}, getDefaultAttrs(opt.attributes, schema), model.attributes, attrs),
        allErrors = validateWithSchema(allAttrs, schema),
        invalidAttrs = pickMatchingErrors(allErrors, requestedPaths),
        reportedErrors = opt.attributes ? invalidAttrs : allErrors;

      // After validation is performed, loop through all validated and changed attributes
      // and call the valid and invalid callbacks so the view is updated.
      each(requestedPaths, function (attr) {
        var errorMsg = getMatchingError(invalidAttrs, attr);

        if (!errorMsg) {
          opt.valid(attr, model);
        }
        if (errorMsg && (requestedPaths.length || validateAll)) {
          opt.invalid(attr, errorMsg, model);
        }
      });

      // Trigger validated events.
      model.trigger('validated', model, reportedErrors, setOptions);

      // Return any error messages to Nextbone.
      if (invalidAttrs && hasMatchingPaths(invalidAttrs, requestedPaths)) {
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

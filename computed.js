import { isEmpty, reduce, omit } from 'lodash-es';

/**
 * @import { Model } from './nextbone.js'
 */

/**
 * @template T
 * @typedef {new (...args: any[]) => T} Ctor
 */

// todo: add a generic type for the computed fields, so `fields` have the same type as the model attributes

/**
 * @callback ComputedFieldGet
 * @param {Record<string, any>} fields
 * @returns {any}
 *
 * @typedef ComputedField
 * @property {string[]} depends
 * @property {ComputedFieldGet} get
 * @property {(value: any, fields: Record<string, any>) => any} set
 * Not possible to use rest params here: https://github.com/Microsoft/TypeScript/issues/15190
 * @typedef {[string, ComputedFieldGet]}  ShortHandComputedField1
 * @typedef {[string, string, ComputedFieldGet]} ShortHandComputedField2
 * @typedef {[string, string, string, ComputedFieldGet]} ShortHandComputedField3
 * @typedef {[string, string, string, string, ComputedFieldGet]} ShortHandComputedField4
 * @typedef {[string, string, string, string, string, ComputedFieldGet]} ShortHandComputedField5
 * @typedef {[string, string, string, string, string, string, ComputedFieldGet]} ShortHandComputedField6
 * @typedef {ShortHandComputedField1 | ShortHandComputedField2 | ShortHandComputedField3 | ShortHandComputedField4 | ShortHandComputedField5 | ShortHandComputedField6} ShortHandComputedField
 *
 * @typedef {Record<string, ComputedField | ShortHandComputedField>} ComputedDefs
 */

/**
 * @param { ComputedField } computedField
 * @param { Model } model
 * @returns
 */
const computeFieldValue = (computedField, model) => {
  if (computedField && computedField.get) {
    const values = getDependentValues(computedField.depends, model);
    return computedField.get.call(model, values);
  }
};

const getDependentValues = (depends, model) => {
  if (!depends) return {};
  return depends.reduce((memo, field) => {
    if (typeof field === 'string') {
      memo[field] = model.get(field);
    }
    return memo;
  }, {});
};

const createFieldFromArray = (arr) => {
  const depends = [];
  let get, set;
  arr.forEach((item) => {
    switch (typeof item) {
      case 'string':
        depends.push(item);
        break;
      case 'function':
        if (!get) {
          get = item;
        } else {
          set = item;
        }
        break;

      default:
        break;
    }
  });
  return { depends, get, set };
};

const createNormalizedOptions = (options) => {
  if (!options) return;
  const excludeFromJSON = reduce(
    options,
    (result, def, key) => {
      if (def.toJSON !== true) {
        result.push(key);
      }
      return result;
    },
    [],
  );

  const fields = [];
  for (let key in options) {
    const field = options[key];
    if (Array.isArray(field)) {
      fields.push({ name: key, field: createFieldFromArray(field) });
    } else if (field && (field.set || field.get)) {
      fields.push({ name: key, field: field });
    }
  }

  return { excludeFromJSON, fields };
};

class ComputedFields {
  constructor(model, fields) {
    this.model = model;
    this._bindModelEvents(fields);
  }

  _bindModelEvents(fields) {
    fields.forEach((computedField) => {
      const fieldName = computedField.name;
      const field = computedField.field;

      const updateComputed = () => {
        var value = computeFieldValue(field, this.model);
        this.model.set(fieldName, value, { __computedSkip: true });
      };

      const updateDependent = (model, value, options) => {
        if (options && options.__computedSkip) {
          return;
        }

        if (field.set) {
          const values = getDependentValues(field.depends, this.model);
          value = value || this.model.get(fieldName);

          field.set.call(this.model, value, values);
          this.model.set(values, options);
        }
      };

      this.model.on('change:' + fieldName, updateDependent);

      if (field.depends) {
        field.depends.forEach((dependent) => {
          if (typeof dependent === 'string') {
            this.model.on('change:' + dependent, updateComputed);
          }

          if (typeof dependent === 'function') {
            dependent.call(this.model, updateComputed);
          }
        });
      }

      if (!isEmpty(this.model.attributes)) {
        updateComputed();
      }
    });
  }
}

const excludeFromJSONKey = Symbol('excludeFromJSON');

const getComputedOptions = (ctor) => {
  if (ctor.hasOwnProperty('__computedOptions')) {
    return ctor.__computedOptions;
  }
  return (ctor.__computedOptions = createNormalizedOptions(ctor.computed));
};

const createClass = (ModelClass) => {
  return class extends ModelClass {
    constructor(...args) {
      super(...args);
      const options = getComputedOptions(this.constructor);
      if (options) {
        this.computedFields = new ComputedFields(this, options.fields);
        if (options.excludeFromJSON.length) {
          this[excludeFromJSONKey] = options.excludeFromJSON;
        }
      }
    }

    toJSON(...args) {
      const result = super.toJSON(...args);
      const excludeFromJSON = this[excludeFromJSONKey];
      if (!excludeFromJSON || (args[0] && args[0].computed)) {
        return result;
      }
      return omit(result, excludeFromJSON);
    }
  };
};

/**
 * @typedef ComputedStaticMixin
 * @property {ComputedDefs} computed
 */

/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & ComputedStaticMixin}
 */
function withComputed(ctorOrDescriptor) {
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
}

export { withComputed };

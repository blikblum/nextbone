import {isEmpty, reduce, omit} from 'underscore';

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

const createFieldFromArray = arr => {
  const depends = []
  let get, set
  arr.forEach(item => {
    switch (typeof item) {
      case 'string':
        depends.push(item)
        break;
      case 'function':
        if (!get) {
          get = item
        } else {
          set = item
        } 
        break;  
    
      default:
        break;
    }
  })
  return {depends, get, set}
}

class ComputedFields {
  constructor(model, fields) {
    this.model = model;
    this._bindModelEvents(fields);
  }

  _bindModelEvents(fields) {
    fields.forEach(computedField => {
      const fieldName = computedField.name;
      const field = computedField.field;

      const updateComputed = () => {
        var value = computeFieldValue(field, this.model);
        this.model.set(fieldName, value, {__computedSkip: true});
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
        field.depends.forEach(dependent => {
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

const createClass = (ModelClass, options) => {
  const excludeFromJSON = reduce(options, (result, def, key) => {
    if (def.toJSON === false) {
      result.push(key);
    }
    return result;
  }, []);

  const fields = [];
  for (let key in options) {
    const field = options[key];
    if (Array.isArray(field)) {
      fields.push({name: key, field: createFieldFromArray(field)})
    } else if (field && (field.set || field.get)) {
      fields.push({name: key, field: field});
    }
  }

  return class extends ModelClass {
    constructor(...args) {
      super(...args);
      this.computedFields = new ComputedFields(this, fields);
    }

    toJSON(...args) {
      const result = super.toJSON(...args);
      if (!excludeFromJSON.length || args[0] && args[0].computedFields) {
        return result;
      }
      return omit(result, excludeFromJSON);
    }
  };
};

const computed = options => ctorOrDescriptor => {
  if (typeof ctorOrDescriptor === 'function') {
    return createClass(ctorOrDescriptor, options);
  }
  const {kind, elements} = ctorOrDescriptor;
  return {
    kind,
    elements,
    finisher(ctor) {
      return createClass(ctor, options);
    }
  };
};


export {
  computed
};

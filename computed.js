import _ from 'underscore';

class ComputedFields {
  constructor(model, options) {
    this.model = model;
    this.options = options;
    this._computedFields = [];
    this.initialize();
  }

  initialize() {
    this._lookUpComputedFields();
    this._bindModelEvents();
  }

  _lookUpComputedFields() {
    var computed = _.isFunction(this.options) ? this.options() : this.options;

    for (var key in computed) {
      var field = computed[key];

      if (field && (field.set || field.get)) {
        this._computedFields.push({name: key, field: field});
      }
    }
  }

  _bindModelEvents() {
    this._computedFields.forEach(computedField => {
      var fieldName = computedField.name;
      var field = computedField.field;

      var updateComputed = () => {
        var value = this._computeFieldValue(field);
        this.model.set(fieldName, value, {__computedSkip: true});
      };

      var updateDependent = (model, value, options) => {
        if (options && options.__computedSkip) {
          return;
        }

        if (field.set) {
          var fields = this._dependentFields(field.depends);
          value = value || this.model.get(fieldName);

          field.set.call(this.model, value, fields);
          this.model.set(fields, options);
        }
      };

      this._thenDependentChanges(field.depends, updateComputed);
      this._thenComputedChanges(fieldName, updateDependent);

      if (this._isModelInitialized()) {
        updateComputed();
      }
    });
  }

  _isModelInitialized() {
    return !_.isEmpty(this.model.attributes);
  }

  _thenDependentChanges(depends, callback) {
    depends.forEach(name => {
      if (typeof name === 'string') {
        this.model.on('change:' + name, callback);
      }

      if (typeof name === 'function') {
        name.call(this.model, callback);
      }
    });
  }

  _thenComputedChanges(fieldName, callback) {
    this.model.on('change:' + fieldName, callback);
  }

  _computeFieldValue(computedField) {
    if (computedField && computedField.get) {
      var fields = this._dependentFields(computedField.depends);
      return computedField.get.call(this.model, fields);
    }
  }

  _dependentFields(depends) {
    return depends.reduce((memo, field) => {
      if (_.isString(field)) {
        memo[field] = this.model.get(field);
      }
      return memo;
    }, {});
  }
}


const computed = options => {
  const excludeFromJSON = _.reduce(options, (result, def, key) => {
    if (def.toJSON === false) {
      result.push(key);
    }
  }, []);

  return ModelClass => {
    return class extends ModelClass {
      constructor(...args) {
        super(...args);
        this.computedFields = new ComputedFields(this, options);
      }

      toJSON(...args) {
        const result = super.toJSON(...args);
        if (!excludeFromJSON.length || args[0] && args[0].computedFields) {
          return result;
        }
        return _.omit(result, excludeFromJSON);
      }
    };
  };

};


export {
  computed
};

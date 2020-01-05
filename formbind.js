import { isObject } from 'underscore';
import { delegate } from './nextbone';

function getPathSegments(path) {
  const pathArr = path.split('.');
  const parts = [];

  for (let i = 0; i < pathArr.length; i++) {
    let p = pathArr[i];

    while (p[p.length - 1] === '\\' && pathArr[i + 1] !== undefined) {
      p = p.slice(0, -1) + '.';
      p += pathArr[++i];
    }

    parts.push(p);
  }

  return parts;
}

// todo: use lodash `get/set` when/if using lodash instead of underscore

const getPath = (object, path, value) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean);
  // Find value if exist return otherwise return undefined value;
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object) || value;
};

function setPath(obj, path, value) {
  if (!isObject(obj) || typeof path !== 'string') {
    return obj;
  }

  const root = obj;
  const pathArr = getPathSegments(path);

  for (let i = 0; i < pathArr.length; i++) {
    const p = pathArr[i];

    if (!isObject(obj[p])) {
      obj[p] = {};
    }

    if (i === pathArr.length - 1) {
      obj[p] = value;
    }

    obj = obj[p];
  }

  return root;
}

function toNull(value) {
  return (typeof value === 'string' && value.trim() === '') || value == null ? null : value;
}

function parseNumber(value) {
  const n = parseFloat(value);
  const isNumeric = value == n; // eslint-disable-line eqeqeq
  return isNumeric ? n : toNull(value);
}

class FormState {
  constructor(el, model = 'model') {
    this.el = el;
    this.model = model;
    this.errors = {};
    this.touched = {};
  }

  getValue(attr, model) {
    model = model ? (typeof model === 'string' ? this.el[model] : model) : this.el[this.model];
    return getPath(model.attributes, attr);
  }

  isValid(model) {
    model = model ? (typeof model === 'string' ? this.el[model] : model) : this.el[this.model];
    const result = model.isValid();
    if (result) {
      Object.keys(model.attributes).forEach(key => {
        delete this.errors[key];
      });
    } else {
      if (isObject(model.validationError)) Object.assign(this.errors, model.validationError);
    }
  }
}

const defaultInputs = {
  select: ['input'],
  input: ['input'],
  'input[type=radio]': ['change'],
  'input[type=checkbox]': ['change']
};

const createClass = (ctor, options = {}) => {
  const inputs = options.inputs ? Object.assign({}, defaultInputs, options.inputs) : defaultInputs;
  const events = Object.keys(inputs).reduce((result, selector) => {
    inputs[selector].forEach(event => result.push({ event, selector }));
    return result;
  }, []);

  return class extends ctor {
    constructor() {
      super();
      this.form = new FormState(this, options.model);
      events.forEach(({ event, selector }) =>
        delegate(this.renderRoot || this, event, selector, this.updateModel, this)
      );
    }

    updateModel(e) {
      const inputEl = e.target;
      if (inputEl.hasAttribute('no-bind')) return;
      const prop = inputEl.name;
      if (!prop) return;
      const propType = inputEl.dataset.propType || inputEl.type;
      const modelOption = inputEl.model || inputEl.dataset.model || options.model || 'model';
      const model = typeof modelOption === 'string' ? this[modelOption] : modelOption;

      if (!model) {
        console.warn(
          `formBind: could not find model "${modelOption}" in element "${this.tagName}"`
        ); // eslint-disable-line no-console
        return;
      }

      let value;
      switch (inputEl.type) {
        case 'checkbox':
          value = Boolean(inputEl.checked);
          break;
        default:
          value = inputEl.value;
      }
      switch (propType) {
        case 'number':
          value = parseNumber(inputEl.value);
          break;
      }

      // handle nested attributes
      if (prop.indexOf('.') !== -1) {
        const attrs = Object.assign({}, model.attributes);
        setPath(attrs, prop, value);
        model.set(attrs);
        if (!Object.keys(model.changed).length) {
          model.trigger('change', model, {});
        }
      } else {
        model.set(prop, value);
      }
      this.form.touched[prop] = true;

      if (model.validate) {
        const errors = model.validate(model.attributes, { attributes: [prop] });
        if (errors) {
          if (isObject(errors)) {
            Object.assign(this.form.errors, errors);
          } else {
            this.form.errors[prop] = errors;
          }
        } else {
          delete this.form.errors[prop];
        }
      }
    }
  };
};

export const formBind = (optionsOrCtorOrDescriptor, options) => {
  // current state of decorators sucks. Lets abuse of duck typing
  if (typeof optionsOrCtorOrDescriptor === 'function') {
    // constructor -> typescript decorator
    return createClass(optionsOrCtorOrDescriptor, options);
  }
  if (optionsOrCtorOrDescriptor.kind === 'class') {
    // descriptor -> spec decorator
    const { kind, elements } = optionsOrCtorOrDescriptor;
    return {
      kind,
      elements,
      finisher(ctor) {
        return createClass(ctor, options);
      }
    };
  }
  // optionsOrCtorOrDescriptor === options
  return ctorOrDescriptor => {
    return formBind(ctorOrDescriptor, optionsOrCtorOrDescriptor);
  };
};

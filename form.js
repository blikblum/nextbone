import { isObject, isEqual } from 'lodash-es';
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

export const getPath = (object, path) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean);
  // Find value if exist return otherwise return undefined value;
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object);
};

export const setPath = (obj, path, value) => {
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

  return pathArr[0];
};

function toNull(value) {
  return (typeof value === 'string' && value.trim() === '') || value == null ? null : value;
}

function parseNumber(value) {
  const n = parseFloat(value);
  const isNumeric = value == n; // eslint-disable-line eqeqeq
  return isNumeric ? n : toNull(value);
}

const formats = {
  number: parseNumber
};

const NO_BIND_ATTRIBUTE = 'no-form-bind';

class FormState {
  constructor(el, model = 'model', events, updateMethod) {
    this._data = {};
    this._attributes = new Set();
    this.el = el;
    this.model = model;
    this.events = events;
    this.updateMethod = updateMethod;
    this.reset();
  }

  getAttributes() {
    if (!this.__selector) {
      this.__selector = this.events.map(event => event.selector).join(', ');
    }
    const renderRoot = this.el.renderRoot || this.el;
    const result = Array.from(this._attributes);
    renderRoot.querySelectorAll(this.__selector).forEach(el => {
      const name = el.getAttribute('name');
      if (name && result.indexOf(name) === -1 && !el.hasAttribute(NO_BIND_ATTRIBUTE)) {
        result.push(name);
      }
    });
    return result;
  }

  getValue(attr, model = this.model) {
    model = typeof model === 'string' ? this.el[model] : model;
    return getPath(model.attributes, attr);
  }

  setValue(attr, value, model = this.model) {
    model = typeof model === 'string' ? this.el[model] : model;
    if (!this.modelInitialData.get(model)) {
      this.modelInitialData.set(model, Object.assign({}, model.attributes));
    }
    this._attributes.add(attr);
    setModelValue(model, attr, value);
    if (typeof this.el[this.updateMethod] === 'function') {
      this.el[this.updateMethod]();
    }
  }

  getData(prop) {
    return this._data[prop];
  }

  setData(prop, value) {
    this._data[prop] = value;
    if (typeof this.el[this.updateMethod] === 'function') {
      this.el[this.updateMethod]();
    }
  }

  isDirty({ model = this.model } = {}) {
    model = typeof model === 'string' ? this.el[model] : model;
    const initialData = this.modelInitialData.get(model);
    return initialData ? !isEqual(model.attributes, initialData) : false;
  }

  isValid({ model = this.model, attributes = this.getAttributes(), update, touch } = {}) {
    model = typeof model === 'string' ? this.el[model] : model;
    const result = model.isValid(attributes);
    if (result) {
      attributes.forEach(key => {
        delete this.errors[key];
      });
    } else if (isObject(model.validationError)) {
      Object.assign(this.errors, model.validationError);
    }
    if (touch) {
      Object.keys(this.errors).forEach(key => (this.touched[key] = true));
    }
    if (update && typeof this.el[this.updateMethod] === 'function') {
      this.el[this.updateMethod]();
    }
    return result;
  }

  loadInitialData({ model = this.model } = {}) {
    model = typeof model === 'string' ? this.el[model] : model;
    this.modelInitialData.set(model, Object.assign({}, model.attributes));
  }

  reset() {
    this.errors = {};
    this.touched = {};
    this._attributes = new Set();
    this.modelInitialData = new WeakMap();
  }
}

const defaultInputs = {
  select: ['input'],
  input: ['input'],
  textarea: ['change'],
  'input[type=radio]': ['change'],
  'input[type=checkbox]': ['change'],
  '[form-bind]': ['change']
};

const createClass = (ctor, options = {}) => {
  const updateMethod = options.updateMethod || 'requestUpdate';
  const inputs = options.inputs ? Object.assign({}, defaultInputs, options.inputs) : defaultInputs;
  const events = Object.keys(inputs).reduce((result, selector) => {
    inputs[selector].forEach(event => result.push({ event, selector }));
    return result;
  }, []);

  function updateModel(e) {
    const inputEl = e.target;
    if (inputEl.hasAttribute(NO_BIND_ATTRIBUTE)) return;
    const prop = inputEl.getAttribute('name');
    if (!prop) return;
    const formatter = formats[inputEl.dataset.format || inputEl.type];
    const modelOption = inputEl.model || inputEl.dataset.model || options.model || 'model';
    const model = typeof modelOption === 'string' ? this[modelOption] : modelOption;

    if (!model) {
      // eslint-disable-next-line no-console
      console.warn(`formBind: could not find model "${modelOption}" in element "${this.tagName}"`);
      return;
    }

    e.stopPropagation();

    if (!this.form.modelInitialData.get(model)) {
      this.form.loadInitialData({ model });
    }

    let value;
    switch (inputEl.type) {
      case 'checkbox':
        value = Boolean(inputEl.checked);
        break;
      default:
        value = inputEl.value;
    }
    if (formatter) {
      value = formatter(value);
    }

    setModelValue(model, prop, value);

    if (!this.form.touched[prop]) {
      inputEl.addEventListener(
        'blur',
        () => {
          this.form.touched[prop] = true;
          if (typeof this[updateMethod] === 'function') {
            this[updateMethod]();
          }
        },
        { once: true }
      );
    }

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
    if (typeof this[updateMethod] === 'function') {
      this[updateMethod]();
    }
  }

  return class extends ctor {
    constructor() {
      super();
      this.form = new FormState(this, options.model, events, updateMethod);
      events.forEach(({ event, selector }) =>
        delegate(this.renderRoot || this, event, selector, updateModel, this)
      );
    }
  };
};

export const registerFormat = (name, fn) => {
  formats[name] = fn;
};

export const form = (optionsOrCtorOrDescriptor, options) => {
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
    return form(ctorOrDescriptor, optionsOrCtorOrDescriptor);
  };
};
function setModelValue(model, prop, value) {
  // handle nested attributes
  if (prop.indexOf('.') !== -1) {
    // optimize to avoid cloning and setting entire attributes
    const attrs = Object.assign({}, model.attributes);
    const rootAttr = setPath(attrs, prop, value);
    model.set(attrs);
    if (!Object.keys(model.changed).length) {
      model.trigger(`change:${rootAttr}`, model, {});
      model.trigger('change', model, {});
    }
  } else {
    model.set(prop, value);
  }
}

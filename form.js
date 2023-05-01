import { isPlainObject, isEqual } from 'lodash-es';
import { delegate } from './nextbone.js';
import { deepCloneLite } from './utils.js';

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

export const getPath = (object, path) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArray = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean);
  // Find value if exist return otherwise return undefined value;
  return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], object);
};

export const setPath = (object, path, value) => {
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets
  const pathArr = Array.isArray(path) ? path : path.split(/[,[\].]/g).filter(Boolean);

  let runValue = object;

  for (let i = 0; i < pathArr.length; i++) {
    const p = pathArr[i];

    if (i === pathArr.length - 1) {
      runValue[p] = value;
    } else {
      if (!isPlainObject(runValue[p])) {
        runValue[p] = {};
      }
      runValue = runValue[p];
    }
  }
};

export const getPathChange = (obj, path, value) => {
  const pathArr = getPathSegments(path);

  const attr = pathArr[0];

  const origValue = obj[attr];

  const newValue = isPlainObject(origValue) ? { ...origValue } : {};

  let runValue = newValue;

  for (let i = 1; i < pathArr.length; i++) {
    const p = pathArr[i];

    if (i === pathArr.length - 1) {
      runValue[p] = value;
    } else {
      if (!isPlainObject(runValue[p])) {
        runValue[p] = {};
      }
      runValue = runValue[p];
    }
  }

  return [attr, newValue];
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

const defaultInputs = {
  select: ['input'],
  input: ['input'],
  textarea: ['change'],
  'input[type=radio]': ['change'],
  'input[type=checkbox]': ['change'],
  '[form-bind]': ['change']
};

let defaultInputEvents;

function createInputEvents(inputs) {
  return Object.keys(inputs).reduce((result, selector) => {
    inputs[selector].forEach(event => result.push({ event, selector }));
    return result;
  }, []);
}

function getInputEvents(customInputs) {
  if (!customInputs) {
    return defaultInputEvents || (defaultInputEvents = createInputEvents(defaultInputs));
  }
  return createInputEvents(Object.assign({}, defaultInputs, customInputs));
}

function inputEventHandler(e) {
  // this === FormState instance
  const { el, touched, updateMethod } = this;
  const inputEl = e.target;
  if (inputEl.hasAttribute(NO_BIND_ATTRIBUTE)) return;
  const prop = inputEl.getAttribute('name');
  if (!prop || !this.acceptInput(prop, e)) return;
  const formatter = formats[inputEl.dataset.format || inputEl.type];
  const model = this.modelInstance;

  if (!model) {
    // eslint-disable-next-line no-console
    console.warn(`form: could not find model "${this.model}" in element "${el.tagName}"`);
    return;
  }

  e.stopPropagation();

  this._ensureInitialData(model);

  let value = inputEl.value;
  if (formatter) {
    value = formatter(value);
  }

  if (inputEl.type === 'checkbox') {
    if (inputEl.hasAttribute('value')) {
      const previousValue = getPath(model.attributes, prop);
      if (Array.isArray(previousValue)) {
        const valueIndex = previousValue.indexOf(value);
        if (inputEl.checked) {
          // eslint-disable-next-line max-depth
          if (valueIndex === -1) {
            previousValue.push(value);
          }
        } else if (valueIndex !== -1) {
          previousValue.splice(valueIndex, 1);
        }
        value = previousValue.slice();
      } else {
        value = inputEl.checked ? [value] : [];
      }
    } else {
      value = Boolean(inputEl.checked);
    }
  }

  setModelValue(model, prop, value);

  if (!touched[prop]) {
    inputEl.addEventListener(
      'blur',
      () => {
        touched[prop] = true;
        if (typeof el[updateMethod] === 'function') {
          el[updateMethod]();
        }
      },
      { once: true }
    );
  }

  if (model.validate) {
    const modelErrors = model.validate(model.attributes, { attributes: [prop] });
    if (modelErrors) {
      if (isPlainObject(modelErrors)) {
        Object.assign(this.errors, modelErrors);
      } else {
        this.errors[prop] = modelErrors;
      }
    } else {
      delete this.errors[prop];
    }
  }
  if (typeof el[updateMethod] === 'function') {
    el[updateMethod]();
  }
}

export class FormState {
  constructor(
    el,
    {
      model = 'model',
      updateMethod = 'requestUpdate',
      inputs,
      events = getInputEvents(inputs)
    } = {}
  ) {
    this._data = {};
    this._attributes = new Set();
    this._modelInstance = undefined;
    this.el = el;
    this.model = model;
    this.events = events;
    this.updateMethod = updateMethod;
    this.reset();
    events.forEach(({ event, selector }) =>
      delegate(el.renderRoot || el, event, selector, inputEventHandler, this)
    );
  }

  get modelInstance() {
    return (
      this._modelInstance ||
      (this._modelInstance = typeof this.model === 'string' ? this.el[this.model] : this.model)
    );
  }

  acceptInput(prop, event) {
    return true;
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

  get(attr, { meta } = {}) {
    return meta ? this._data[attr] : getPath(this.modelInstance.attributes, attr);
  }

  set(attr, value, { meta, reset, update = true } = {}) {
    if (meta) {
      this._data[attr] = value;
    } else {
      const model = this.modelInstance;
      this._ensureInitialData(model);
      this._attributes.add(attr);
      setModelValue(model, attr, value);
      if (reset) {
        delete this.errors[attr];
        delete this.touched[attr];
        const initialData = this.modelInitialData.get(model);
        setPath(initialData, attr, value);
      }
    }

    if (update && typeof this.el[this.updateMethod] === 'function') {
      this.el[this.updateMethod]();
    }
  }

  _ensureInitialData(model) {
    if (!this.modelInitialData.has(model)) {
      // cloning up to 5 levels should be more than enough
      this.modelInitialData.set(model, deepCloneLite(model.attributes, 5));
    }
  }

  getValue(attr) {
    return this.get(attr);
  }

  setValue(attr, value) {
    this.set(attr, value);
  }

  getData(prop) {
    return this.get(prop, { meta: true });
  }

  setData(prop, value) {
    this.set(prop, value, { meta: true });
  }

  isDirty() {
    const model = this.modelInstance;
    const initialData = this.modelInitialData.get(model);
    return initialData ? !isEqual(model.attributes, initialData) : false;
  }

  getDirtyAttributes() {
    const result = [];
    const model = this.modelInstance;
    const initialData = this.modelInitialData.get(model);
    if (initialData) {
      const attributes = this.getAttributes();
      for (const attribute of attributes) {
        const initialValue = getPath(initialData, attribute);
        const modelValue = getPath(model.attributes, attribute);
        if (!isEqual(modelValue, initialValue)) {
          result.push(attribute);
        }
      }
    }
    return result;
  }

  isValid({ attributes = this.getAttributes(), update, touch } = {}) {
    const model = this.modelInstance;
    const result = model.isValid(attributes);
    if (result) {
      attributes.forEach(key => {
        delete this.errors[key];
      });
    } else if (isPlainObject(model.validationError)) {
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

  loadInitialData() {
    const model = this.modelInstance;
    this.modelInitialData.set(model, Object.assign({}, model.attributes));
  }

  reset() {
    this.errors = {};
    this.touched = {};
    this._attributes = new Set();
    this.modelInitialData = new WeakMap();
  }
}

const createClass = (ctor, options = {}) => {
  const { model, inputs, updateMethod } = options;

  return class extends ctor {
    constructor() {
      super();
      this.form = new FormState(this, { model, inputs, updateMethod });
    }
  };
};

export const registerFormat = (name, fn) => {
  formats[name] = fn;
};

export const registerInput = (selector, events) => {
  defaultInputEvents = undefined;
  defaultInputs[selector] = events;
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
    const attrs = Object.assign({}, model.attributes);
    const [attr, newValue] = getPathChange(attrs, prop, value);
    model.set(attr, newValue);
  } else {
    model.set(prop, value);
  }
}

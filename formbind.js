import _ from 'underscore';
import {delegate} from './nextbone';

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

// todo: use lodash `set` when/if using lodash instead of underscore
function setPath(obj, path, value) {
  if (!_.isObject(obj) || typeof path !== 'string') {
    return obj;
  }

  const root = obj;
  const pathArr = getPathSegments(path);

  for (let i = 0; i < pathArr.length; i++) {
    const p = pathArr[i];

    if (!_.isObject(obj[p])) {
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
  return typeof value === 'string' && value.trim() === '' || value == null ? null : value;
}

function parseNumber(value) {
  const n = parseFloat(value);
  const isNumeric = value == n; // eslint-disable-line eqeqeq
  return isNumeric ? n : toNull(value);
}


const defaultInputs = {
  'select': ['input'],
  'input': ['input'],
  'input[type=radio]': ['change']
};

const createClass = (ctor, options = {}) => {
  const inputs = options.inputs ? Object.assign({}, defaultInputs, options.inputs) : defaultInputs;
  const events = Object.keys(inputs).reduce((result, selector) => {
    inputs[selector].forEach(event => result.push({event, selector}));
    return result;
  }, []);

  class FormBindMixin extends ctor {
    constructor() {
      super();
      events.forEach(({event, selector}) => delegate(this, event, selector, this.updateModel));
    }

    updateModel(e) {
      const inputEl = e.target;
      const prop = inputEl.name;
      if (!prop) return;
      const propType = inputEl.dataset.propType || inputEl.type;
      const modelName = inputEl.dataset.modelName || options.modelName || 'model';
      let model = inputEl.model;
      if (!model) {
        model = this[modelName];
      }
      if (!model) {
        console.warn(`formBind: could not find model "${modelName}" in element "${this.tagName}"`);
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
        const attrs = _.clone(model.attributes);
        setPath(attrs, prop, value);
        model.set(attrs, {validate: true, attributes: [prop]});
      } else {
        model.set(prop, value, {validate: true, attributes: [prop]});
      }
    }
  }
  return FormBindMixin;
};


export const formBind = (optionsOrCtorOrDescriptor, options) => {
  // current state of decorators sucks. Lets abuse of duck typing
  if (typeof optionsOrCtorOrDescriptor === 'function') {
    // constructor -> typescript decorator
    return createClass(optionsOrCtorOrDescriptor, options);
  }
  if (optionsOrCtorOrDescriptor.kind === 'class') {
    // descriptor -> spec decorator
    const {kind, elements} = optionsOrCtorOrDescriptor;
    return {
      kind,
      elements,
      finisher(ctor) {
        return createClass(ctor, options);
      }
    };
  }
  // optionsOrCtorOrDescriptor === options
  return (ctorOrDescriptor) => {
    return formBind(ctorOrDescriptor, optionsOrCtorOrDescriptor);
  };
};

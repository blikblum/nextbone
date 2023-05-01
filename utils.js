import { isPlainObject } from 'lodash-es';

function cloneObject(obj) {
  return Object.assign({}, obj);
}

// clone that deep copy array and object one level
function deepCloneLite(obj, level = 1) {
  var result = {};
  Object.keys(obj).forEach(key => {
    var value = obj[key];
    if (Array.isArray(value)) {
      result[key] = value.slice(0);
    } else if (isPlainObject(value)) {
      result[key] = level > 0 ? deepCloneLite(value, level - 1) : cloneObject(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}

export { deepCloneLite, cloneObject };

const resolved = Promise.resolve();

const startPromiseMap = new WeakMap();

const getStartPromise = (instance, startMethod) => {
  let result = typeof startMethod === 'function' ? startPromiseMap.get(instance) : resolved;
  if (!result) {
    result = resolved.then(() => startMethod.call(instance));
    startPromiseMap.set(instance, result);
  }
  return result;
};

const createAsyncMethod = descriptor => {
  const method = descriptor.value;
  descriptor.value = function(...args) {
    const promise = getStartPromise(this, this.start).then(() => method.apply(this, args));

    promise.catch(err => {
      typeof this.onError === 'function' && this.onError(err);
    });

    return promise;
  };
};

export const asyncMethod = (protoOrDescriptor, methodName, propertyDescriptor) => {
  if (typeof methodName !== 'string') {
    // spec decorator
    createAsyncMethod(protoOrDescriptor.descriptor);
    return protoOrDescriptor;
  }
  createAsyncMethod(propertyDescriptor);
};

export const defineAsyncMethods = (klass, methodNames) => {
  const proto = klass.prototype;
  methodNames.forEach(methodName => {
    const desc = Object.getOwnPropertyDescriptor(proto, methodName);
    asyncMethod(proto, methodName, desc);
    Object.defineProperty(proto, methodName, desc);
  });
};

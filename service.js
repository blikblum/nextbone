const resolved = Promise.resolve();

const startPromiseMap = new WeakMap();

const getStartPromise = (instance, startMethod) => {
  let result = startPromiseMap.get(instance);
  if (!result) {
    result = resolved.then(() => startMethod.call(instance));
    startPromiseMap.set(instance, result);
  }
  return result;
};

export const asyncMethod = (protoOrDescriptor, methodName, propertyDescriptor) => {
  if (typeof methodName !== 'string') {
    // spec decorator
  }

  const startMethod = protoOrDescriptor.start;
  const method = propertyDescriptor.value;
  propertyDescriptor.value = function(...args) {
    const startPromise = startMethod ? getStartPromise(this, startMethod) : resolved;
    const promise = startPromise.then(() => method.apply(this, args));

    promise.catch(err => {
      typeof this.onError === 'function' && this.onError(err);
    });

    return promise;
  };
};

export const defineAsyncMethods = (klass, methodNames) => {
  const proto = klass.prototype;
  methodNames.forEach(methodName => {
    const desc = Object.getOwnPropertyDescriptor(proto, methodName);
    asyncMethod(proto, methodName, desc);
    Object.defineProperty(proto, methodName, desc);
  });
};

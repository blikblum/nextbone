const resolved = Promise.resolve();

const startPromiseMap = new WeakMap<object, Promise<unknown>>();

export interface AsyncMethodHost {
  start?(): unknown;
  onError?(error: unknown): unknown;
}

export type AsyncMethodDescriptor<This extends AsyncMethodHost = AsyncMethodHost> =
  TypedPropertyDescriptor<(this: This, ...args: any[]) => any>;

export interface AsyncMethodSpec<This extends AsyncMethodHost = AsyncMethodHost> {
  descriptor: AsyncMethodDescriptor<This>;
}

const getStartPromise = <This extends AsyncMethodHost>(
  instance: This,
  startMethod: This['start'],
) => {
  const canStart = typeof startMethod === 'function';
  let result = canStart ? startPromiseMap.get(instance as object) : resolved;

  if (!result && canStart) {
    result = resolved.then(() => startMethod.call(instance));
    startPromiseMap.set(instance as object, result);
  }

  return result ?? resolved;
};

const createAsyncMethod = <This extends AsyncMethodHost>(descriptor: AsyncMethodDescriptor<This>) => {
  const method = descriptor.value as (this: This, ...args: any[]) => any;

  descriptor.value = function asyncMethodWrapper(this: This, ...args: any[]) {
    const promise = getStartPromise(this, this.start).then(() => method.apply(this, args));

    promise.catch((error) => {
      if (typeof this.onError === 'function') {
        this.onError(error);
      }
    });

    return promise;
  } as AsyncMethodDescriptor<This>['value'];
};

export function asyncMethod<This extends AsyncMethodHost>(
  protoOrDescriptor: AsyncMethodSpec<This>,
): AsyncMethodSpec<This>;
export function asyncMethod<This extends AsyncMethodHost>(
  protoOrDescriptor: object,
  methodName: string,
  propertyDescriptor: AsyncMethodDescriptor<This>,
): void;
export function asyncMethod<This extends AsyncMethodHost>(
  protoOrDescriptor: object | AsyncMethodSpec<This>,
  methodName?: string,
  propertyDescriptor?: AsyncMethodDescriptor<This>,
) {
  if (typeof methodName !== 'string') {
    createAsyncMethod((protoOrDescriptor as AsyncMethodSpec<This>).descriptor);
    return protoOrDescriptor;
  }

  createAsyncMethod(propertyDescriptor as AsyncMethodDescriptor<This>);
}

export const defineAsyncMethods = <
  T extends abstract new (...args: any[]) => AsyncMethodHost,
>(
  klass: T,
  methodNames: Array<Extract<keyof InstanceType<T>, string>>,
) => {
  const proto = klass.prototype;

  methodNames.forEach((methodName) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      proto,
      methodName,
    ) as AsyncMethodDescriptor<InstanceType<T>>;

    asyncMethod(proto, methodName, descriptor);
    Object.defineProperty(proto, methodName, descriptor);
  });
};
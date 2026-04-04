import { beforeEach, describe, expect, it, vi } from 'vitest';

import { asyncMethod, defineAsyncMethods } from './class-utils.js';

const expectCalledOn = (fn: ReturnType<typeof vi.fn>, context: unknown) => {
  expect(fn.mock.contexts[0]).toBe(context);
};

type AsyncService = {
  start(): void;
  foo(...args: any[]): Promise<unknown>;
  bar(...args: any[]): Promise<unknown>;
  onError(error: unknown): void;
};

describe('asyncMethod', () => {
  let fooStub: ReturnType<typeof vi.fn>;
  let barSpy: ReturnType<typeof vi.fn>;
  let startSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;
  let myService: AsyncService;

  beforeEach(() => {
    fooStub = vi.fn();
    barSpy = vi.fn();
    startSpy = vi.fn();
    errorSpy = vi.fn();

    class MyService {
      start() {
        startSpy.call(this);
      }

      @asyncMethod
      foo(...args: any[]) {
        fooStub.apply(this, args);
      }

      @asyncMethod
      bar(...args: any[]) {
        barSpy.apply(this, args);
        return 'x';
      }

      onError(error: unknown) {
        errorSpy.call(this, error);
      }
    }

    myService = new MyService() as unknown as AsyncService;
  });

  it('returns a promise', () => {
    expect(myService.foo()).toBeInstanceOf(Promise);
  });

  it('resolves with the method return value', async () => {
    await expect(myService.bar()).resolves.toBe('x');
  });

  it('calls the original method with its arguments', async () => {
    await myService.foo(1, 'a');

    expect(fooStub).toHaveBeenCalledOnce();
    expect(fooStub).toHaveBeenCalledWith(1, 'a');
    expectCalledOn(fooStub, myService);
  });

  it('calls start() before the method', async () => {
    await myService.foo();

    expect(startSpy).toHaveBeenCalledOnce();
    expect(startSpy.mock.invocationCallOrder[0]).toBeLessThan(fooStub.mock.invocationCallOrder[0]);
  });

  it('only calls start() once', async () => {
    await Promise.all([myService.foo(), myService.bar()]);

    expect(startSpy).toHaveBeenCalledOnce();
  });

  it('calls onError when an async method throws', async () => {
    const error = new Error('Err!');
    fooStub.mockImplementation(() => {
      throw error;
    });

    await expect(myService.foo()).rejects.toBe(error);
    expect(errorSpy).toHaveBeenCalledWith(error);
    expectCalledOn(errorSpy, myService);
  });

  it('supports the spec decorator shape', async () => {
    const descriptor = {
      configurable: true,
      enumerable: false,
      writable: true,
      value(this: { start(): void; onError(error: unknown): void }, value: string) {
        barSpy(value);
        return value;
      },
    };

    const result = asyncMethod({ descriptor });

    expect(result.descriptor).toBe(descriptor);

    const service = {
      start() {
        startSpy();
      },
      onError(error: unknown) {
        errorSpy(error);
      },
    };

    const decorated = result.descriptor.value?.call(service, 'x');

    await expect(decorated).resolves.toBe('x');
    expect(startSpy).toHaveBeenCalledOnce();
    expect(barSpy).toHaveBeenCalledWith('x');
  });
});

describe('defineAsyncMethods', () => {
  let fooStub: ReturnType<typeof vi.fn>;
  let barSpy: ReturnType<typeof vi.fn>;
  let startSpy: ReturnType<typeof vi.fn>;
  let errorSpy: ReturnType<typeof vi.fn>;
  let myService: AsyncService;

  beforeEach(() => {
    fooStub = vi.fn();
    barSpy = vi.fn();
    startSpy = vi.fn();
    errorSpy = vi.fn();

    class MyService {
      start() {
        startSpy.call(this);
      }

      foo(...args: any[]) {
        fooStub.apply(this, args);
      }

      bar(...args: any[]) {
        barSpy.apply(this, args);
        return 'x';
      }

      onError(error: unknown) {
        errorSpy.call(this, error);
      }
    }

    defineAsyncMethods(MyService, ['foo', 'bar']);

    myService = new MyService() as unknown as AsyncService;
  });

  it('returns a promise', () => {
    expect(myService.foo()).toBeInstanceOf(Promise);
  });

  it('resolves with the method return value', async () => {
    await expect(myService.bar()).resolves.toBe('x');
  });

  it('calls the original method with its arguments', async () => {
    await myService.foo(1, 'a');

    expect(fooStub).toHaveBeenCalledOnce();
    expect(fooStub).toHaveBeenCalledWith(1, 'a');
    expectCalledOn(fooStub, myService);
  });

  it('calls start() before the method', async () => {
    await myService.foo();

    expect(startSpy.mock.invocationCallOrder[0]).toBeLessThan(fooStub.mock.invocationCallOrder[0]);
  });

  it('only calls start() once', async () => {
    await Promise.all([myService.foo(), myService.bar()]);

    expect(startSpy).toHaveBeenCalledOnce();
  });

  it('calls onError when an async method throws', async () => {
    const error = new Error('Err!');
    fooStub.mockImplementation(() => {
      throw error;
    });

    await expect(myService.foo()).rejects.toBe(error);
    expect(errorSpy).toHaveBeenCalledWith(error);
    expectCalledOn(errorSpy, myService);
  });
});

import { assert } from './vitest-globals.js';

type EventSource = {
  once(eventName: string, callback: (...args: any[]) => void): unknown;
};

export type ValidationErrors<TKey extends string> = Partial<Record<TKey, string>>;

export const waitForEvent = <TArgs extends unknown[]>(target: EventSource, eventName: string) => {
  return new Promise<TArgs>((resolve) => {
    target.once(eventName, (...args: any[]) => {
      resolve(args as TArgs);
    });
  });
};

export const expectValidSet = <
  TModel extends { set: (...args: any[]) => any; validationError: any },
>(
  model: TModel,
  attrs: Record<string, unknown>,
  options: Record<string, unknown> = {},
) => {
  assert.same(
    model.set(attrs, {
      validate: true,
      ...options,
    }),
    model,
  );
  assert.same(model.validationError, null);
};

export const expectInvalidSet = <
  TModel extends { set: (...args: any[]) => any; validationError: any },
>(
  model: TModel,
  attrs: Record<string, unknown>,
  expectedErrors?: Record<string, string>,
  options: Record<string, unknown> = {},
) => {
  assert.same(
    model.set(attrs, {
      validate: true,
      ...options,
    }),
    model,
  );

  if (expectedErrors) {
    assert.equals(model.validationError, expectedErrors);
  } else {
    assert(model.validationError);
  }
};

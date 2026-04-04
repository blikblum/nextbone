import { afterEach, beforeEach, describe, it } from 'vitest';

const hookNames = new Set(['beforeEach', 'afterEach', 'setUp', 'tearDown']);

const isSuiteNode = (value) => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const defineLegacySuite = (name, suite, getParentContext) => {
  describe(name, () => {
    let context;
    const beforeEachHook = suite.beforeEach ?? suite.setUp;
    const afterEachHook = suite.afterEach ?? suite.tearDown;

    const getContext = () => {
      if (context) {
        return context;
      }

      return getParentContext ? getParentContext() : {};
    };

    if (beforeEachHook) {
      beforeEach(() => {
        context = getParentContext ? getParentContext() : {};
        return beforeEachHook.call(context);
      });
    }

    if (afterEachHook) {
      afterEach(() => {
        return afterEachHook.call(getContext());
      });
    }

    for (const [entryName, entry] of Object.entries(suite)) {
      if (hookNames.has(entryName)) {
        continue;
      }

      if (typeof entry === 'function') {
        it(entryName, () => {
          if (entry.length > 0) {
            return new Promise((resolve, reject) => {
              const done = (error) => {
                if (error) {
                  reject(error);
                  return;
                }

                resolve();
              };

              try {
                entry.call(getContext(), done);
              } catch (error) {
                reject(error);
              }
            });
          }

          return entry.call(getContext());
        });
        continue;
      }

      if (isSuiteNode(entry)) {
        defineLegacySuite(entryName, entry, getContext);
      }
    }
  });
};

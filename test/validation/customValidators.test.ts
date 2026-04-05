import { afterEach, beforeEach, describe, it } from 'vitest';

import { Validation, assert, refute, sinon } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet } from './test-helpers.js';

describe('Extending Validation with custom validator', () => {
  const previousCustom = Validation.validators.custom;

  afterEach(() => {
    if (previousCustom === undefined) {
      delete Validation.validators.custom;
      return;
    }

    Validation.validators.custom = previousCustom;
  });

  it('should execute the custom validator', () => {
    Object.assign(Validation.validators, {
      custom(value: unknown, _attr: string, customValue: number) {
        if (value !== customValue) {
          return 'error';
        }
      },
    });

    class TestModel extends withValidation(Model<{ age?: number }>) {
      static validation = {
        age: {
          custom: 1,
        },
      } as any;
    }

    const model = new TestModel();

    expectValidSet(model, { age: 1 });
    expectInvalidSet(model, { age: 2 });
  });
});

describe('Defining a custom validator as a string', () => {
  class TestModel extends withValidation(Model<{ age?: number | string }>) {
    static validation = {
      age: 'validateAge',
    } as any;

    validateAge(value: number | string) {
      if (![1, '1'].includes(value)) {
        return 'Age invalid';
      }
    }
  }

  let model: TestModel;
  let validateAgeSpy: any;

  beforeEach(() => {
    model = new TestModel();
    validateAgeSpy = sinon.spy(model, 'validateAge');
  });

  it('should execute corresponding method in model', () => {
    expectValidSet(model, { age: 1 });
    sinon.assert.calledOnce(validateAgeSpy);

    expectValidSet(model, { age: '1' });
    sinon.assert.calledTwice(validateAgeSpy);

    expectInvalidSet(model, { age: 2 });
    sinon.assert.calledThrice(validateAgeSpy);
  });
});

describe('Defining a custom validator as a string array', () => {
  class TestModel extends withValidation(Model<{ age?: number | string }>) {
    static validation = {
      age: ['validateAge', 'validateNumber'],
    } as any;

    validateAge(value: number | string) {
      if (value !== 1) {
        return 'Age invalid';
      }
    }

    validateNumber(value: number | string) {
      if (typeof value !== 'number') {
        return 'Not a number';
      }
    }
  }

  let model: TestModel;
  let validateAgeSpy: any;
  let validateNumberSpy: any;

  beforeEach(() => {
    model = new TestModel();
    validateAgeSpy = sinon.spy(model, 'validateAge');
    validateNumberSpy = sinon.spy(model, 'validateNumber');
  });

  it('should use corresponding methods in model', () => {
    expectValidSet(model, { age: 1 });
    sinon.assert.calledOnce(validateAgeSpy);
    sinon.assert.calledOnce(validateNumberSpy);

    expectInvalidSet(model, { age: '1' });
    sinon.assert.calledTwice(validateAgeSpy);
    sinon.assert.calledTwice(validateNumberSpy);
  });
});

describe('Overriding built-in validator in Backbone.Validation', () => {
  const builtinMin = Validation.validators.min;

  afterEach(() => {
    Validation.validators.min = builtinMin;
  });

  it('should execute the overridden validator', () => {
    Object.assign(Validation.validators, {
      min(value: unknown, _attr: string, customValue: number) {
        if (value !== customValue) {
          return 'error';
        }
      },
    });

    class TestModel extends withValidation(Model<{ age?: number }>) {
      static validation = {
        age: {
          min: 1,
        },
      } as any;
    }

    const model = new TestModel();

    expectValidSet(model, { age: 1 });
    expectInvalidSet(model, { age: 2 });
  });
});

describe('Chaining built-in validators with custom', () => {
  const previousCustom = (Validation.validators as Record<string, unknown>).custom;
  const previousCustom2 = (Validation.validators as Record<string, unknown>).custom2;

  afterEach(() => {
    if (previousCustom === undefined) {
      delete (Validation.validators as Record<string, unknown>).custom;
    } else {
      (Validation.validators as Record<string, unknown>).custom = previousCustom;
    }

    if (previousCustom2 === undefined) {
      delete (Validation.validators as Record<string, unknown>).custom2;
      return;
    }

    (Validation.validators as Record<string, unknown>).custom2 = previousCustom2;
  });

  it('violating first validator in chain return first error message', () => {
    Object.assign(Validation.validators, {
      custom2(value: unknown, _attr: string, customValue: string, model: Model) {
        if (value !== customValue) {
          return 'error';
        }
      },
      custom(value: unknown, attr: string, customValue: string, model: Model) {
        return (
          (this as any).required(value, attr, true, model) ||
          (this as any).custom2(value, attr, customValue, model)
        );
      },
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          custom: 'custom',
        },
      } as any;
    }

    const model = new TestModel();

    assert.equals(model.validate({ name: '' }), { name: 'Name is required' });
  });

  it('violating second validator in chain return second error message', () => {
    Object.assign(Validation.validators, {
      custom2(value: unknown, _attr: string, customValue: string, model: Model) {
        if (value !== customValue) {
          return 'error';
        }
      },
      custom(value: unknown, attr: string, customValue: string, model: Model) {
        return (
          (this as any).required(value, attr, true, model) ||
          (this as any).custom2(value, attr, customValue, model)
        );
      },
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          custom: 'custom',
        },
      } as any;
    }

    const model = new TestModel();

    assert.equals(model.validate({ name: 'a' }), { name: 'error' });
  });

  it('violating none of the validators returns undefined', () => {
    Object.assign(Validation.validators, {
      custom2(value: unknown, _attr: string, customValue: string, model: Model) {
        if (value !== customValue) {
          return 'error';
        }
      },
      custom(value: unknown, attr: string, customValue: string, model: Model) {
        return (
          (this as any).required(value, attr, true, model) ||
          (this as any).custom2(value, attr, customValue, model)
        );
      },
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          custom: 'custom',
        },
      } as any;
    }

    const model = new TestModel();

    refute.defined(model.validate({ name: 'custom' }));
  });
});

describe('Formatting custom validator messages', () => {
  const previousCustom = (Validation.validators as Record<string, unknown>).custom;

  afterEach(() => {
    if (previousCustom === undefined) {
      delete (Validation.validators as Record<string, unknown>).custom;
      return;
    }

    (Validation.validators as Record<string, unknown>).custom = previousCustom;
  });

  it('a custom validator can return a formatted message', () => {
    Object.assign(Validation.validators, {
      custom(value: unknown, attr: string, customValue: string, model: Model) {
        if (value !== customValue) {
          return (this as any).format(
            '{0} must be equal to {1}',
            (this as any).formatLabel(attr, model),
            customValue,
          );
        }
      },
    });

    class TestModel extends withValidation(Model<{ name?: string }>) {
      static validation = {
        name: {
          custom: 'custom',
        },
      } as any;
    }

    const model = new TestModel();

    assert.equals(model.validate({ name: '' }), { name: 'Name must be equal to custom' });
  });
});

import { beforeEach, describe, it } from 'vitest';

import { assert } from '../vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { expectInvalidSet, expectValidSet, waitForEvent } from '../test-helpers.js';

type RequiredAttributes = {
  agree?: boolean;
  attr?: string;
  dependsOnName?: string;
  name?: string | null;
  posts?: string[];
};

describe('required validator', () => {
  let attrName: string | undefined;
  let computedState: Record<string, unknown> | undefined;
  let ctx: unknown;
  let model: ReturnType<typeof createModel>;

  function createModel() {
    class TestModel extends withValidation(Model<RequiredAttributes>) {
      static validation = {
        name: {
          required: true,
        },
        agree: {
          required: true,
        },
        posts: {
          required: true,
        },
        dependsOnName: {
          required(
            this: Model<RequiredAttributes>,
            value: unknown,
            attr: string,
            computed: Record<string, unknown>,
          ) {
            ctx = this;
            attrName = attr;
            computedState = computed;
            return this.get('name') === 'name';
          },
        },
      } as any;
    }

    return new TestModel({
      name: 'name',
      agree: true,
      posts: ['post'],
      dependsOnName: 'depends',
    });
  }

  beforeEach(() => {
    attrName = undefined;
    computedState = undefined;
    ctx = undefined;
    model = createModel();
  });

  it('has default error message', async () => {
    const event = waitForEvent<[typeof model, { name: string }]>(model, 'validated');

    expectInvalidSet(model, { name: '' }, { name: 'Name is required' });

    const [, error] = await event;
    assert.equals(error, { name: 'Name is required' });
  });

  it('empty string is invalid', () => {
    expectInvalidSet(model, { name: '' });
  });

  it('non-empty string is valid', () => {
    expectValidSet(model, { name: 'a' });
  });

  it('string with just spaces is invalid', () => {
    expectInvalidSet(model, { name: '  ' });
  });

  it('null is invalid', () => {
    expectInvalidSet(model, { name: null });
  });

  it('undefined is invalid', () => {
    expectInvalidSet(model, { name: undefined });
  });

  it('false boolean is valid', () => {
    expectValidSet(model, { agree: false });
  });

  it('true boolean is valid', () => {
    expectValidSet(model, { agree: true });
  });

  it('empty array is invalid', () => {
    expectInvalidSet(model, { posts: [] });
  });

  it('non-empty array is valid', () => {
    expectValidSet(model, { posts: ['post'] });
  });

  it('required can be specified as a method returning true or false', () => {
    expectValidSet(model, { name: 'aaa' });
    expectValidSet(model, { dependsOnName: undefined });

    expectValidSet(model, { name: 'name' });
    expectInvalidSet(model, { dependsOnName: undefined });
  });

  it('context is the model', () => {
    model.set({ dependsOnName: '' }, { validate: true });

    assert.same(ctx, model);
  });

  it('second argument is the name of the attribute being validated', () => {
    model.set({ dependsOnName: '' }, { validate: true });

    assert.equals(attrName, 'dependsOnName');
  });

  it('third argument is a computed model state', () => {
    model.set({ attr: 'attr' });
    model.set(
      {
        name: 'name',
        posts: ['post'],
        dependsOnName: 'value',
      },
      { validate: true },
    );

    assert.equals(computedState, {
      agree: true,
      attr: 'attr',
      dependsOnName: 'value',
      name: 'name',
      posts: ['post'],
    });
  });
});

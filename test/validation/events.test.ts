import { beforeEach, describe, it } from 'vitest';

import { assert, refute } from './vitest-globals.js';
import { Model } from 'nextbone';
import { withValidation } from 'nextbone/validation.js';

import { waitForEvent } from './test-helpers.js';

class EventModel extends withValidation(Model<{ age?: number; name?: string }>) {
  static validation = {
    age: (value?: number) => {
      if (!value) {
        return 'age';
      }
    },
    name: (value?: string) => {
      if (!value) {
        return 'name';
      }
    },
  } as any;
}

describe('Backbone.Validation events', () => {
  let model: EventModel;

  beforeEach(() => {
    model = new EventModel();
  });

  it('model is updated after the validated event is raised', async () => {
    const changeEvent = waitForEvent<[typeof model, Record<string, unknown>]>(model, 'change');

    model.on('validated', () => {
      refute.defined(model.get('age'));
    });

    model.set(
      {
        age: 1,
        name: 'name',
      },
      { validate: true },
    );

    await changeEvent;
    assert.equals(model.get('age'), 1);
  });

  describe('when model is valid', () => {
    it('validated event is triggered with model and null as errors', async () => {
      const event = waitForEvent<[typeof model, null]>(model, 'validated');

      model.set(
        {
          age: 1,
          name: 'name',
        },
        { validate: true },
      );

      const [validatedModel, errors] = await event;
      assert.same(errors, null);
      assert.same(validatedModel, model);
    });
  });

  describe('when one invalid value is set', () => {
    it('validated event is triggered with model and an object with the names of the attributes with error', async () => {
      const event = waitForEvent<[typeof model, { age: string; name: string }]>(model, 'validated');

      model.set({ age: 0 }, { validate: true });

      const [validatedModel, attrs] = await event;
      assert.same(validatedModel, model);
      assert.equals(attrs, { age: 'age', name: 'name' });
    });

    it('invalid event is triggered with model and an object with the names of the attributes with error', async () => {
      const event = waitForEvent<[typeof model, { age: string; name: string }]>(model, 'invalid');

      model.set({ age: 0 }, { validate: true });

      const [invalidModel, attrs] = await event;
      assert.same(invalidModel, model);
      assert.equals(attrs, { age: 'age', name: 'name' });
    });
  });

  describe('when one valid value is set', () => {
    it('validated event is triggered with model and an object with the names of the attributes with error', async () => {
      const event = waitForEvent<[typeof model, { name: string }]>(model, 'validated');

      model.set(
        {
          age: 1,
        },
        { validate: true },
      );

      const [validatedModel, attrs] = await event;
      assert.same(validatedModel, model);
      assert.equals(attrs, { name: 'name' });
    });
  });
});
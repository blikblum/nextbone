import { beforeEach, describe, expect, it, vi } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type EventAttributes = {
  age?: number | string;
  name?: string;
};

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number({ message: 'Age must be a number' }),
});

class EventModel extends withSchema(Model<EventAttributes>) {
  static schema = schema;
}

describe('Events', () => {
  let model: EventModel;

  beforeEach(() => {
    model = new EventModel();
  });

  describe('validated event is triggered after validation', () => {
    it('with valid model', async () => {
      model.set({ name: 'test', age: 25 });

      await new Promise<void>((resolve) => {
        model.on('validated', (validatedModel, invalidAttrs) => {
          assert.strictEqual(validatedModel, model);
          assert.strictEqual(invalidAttrs, null);
          resolve();
        });

        model.validate();
      });
    });

    it('with invalid model', async () => {
      await new Promise<void>((resolve) => {
        model.on('validated', (validatedModel, invalidAttrs) => {
          assert.strictEqual(validatedModel, model);
          assert.isDefined(invalidAttrs);
          assert.isDefined(invalidAttrs?.name);
          resolve();
        });

        model.validate();
      });
    });
  });

  it('invalid event is triggered when isValid returns false', async () => {
    await new Promise<void>((resolve) => {
      model.on('invalid', (invalidModel, error) => {
        assert.strictEqual(invalidModel, model);
        assert.isDefined(error);
        resolve();
      });

      model.isValid();
    });
  });

  it('invalid event is not triggered when isValid returns true', () => {
    const spy = vi.fn();

    model.set({ name: 'test', age: 25 });
    model.on('invalid', spy);

    model.isValid();

    expect(spy).not.toHaveBeenCalled();
  });
});

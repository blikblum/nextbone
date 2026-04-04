import { beforeEach, describe, it, vi } from 'vitest';

import { assert } from 'chai';

import { Model } from 'nextbone';
import { withSchema } from 'nextbone/schema.js';
import { z } from 'zod';

type ComplexAttributes = {
  age?: number;
  description?: string | null;
  email?: string;
  name?: string;
  nickname?: string;
  password?: string;
  person?: {
    address?: {
      city?: string;
      street?: string;
    };
    name?: string;
  };
  scores?: number[];
  status?: string;
  tags?: string[];
  value?: boolean | number | string;
};

describe('Complex Schema Validation', () => {
  describe('nested objects', () => {
    class NestedObjectModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        person: z.object({
          name: z.string().min(1, 'Name is required'),
          address: z.object({
            street: z.string().min(1, 'Street is required'),
            city: z.string().min(1, 'City is required'),
          }),
        }),
      });
    }

    let model: NestedObjectModel;

    beforeEach(() => {
      model = new NestedObjectModel();
    });

    it('validates valid nested object', () => {
      model.set(
        {
          person: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'New York',
            },
          },
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates invalid nested object', () => {
      model.set(
        {
          person: {
            name: '',
            address: {
              street: '',
              city: '',
            },
          },
        },
        { validate: true },
      );

      assert.isDefined(model.validationError);
      assert.isFalse(model.isValid());
    });

    it('returns flat nested validation errors', () => {
      model.set(
        {
          person: {
            name: '',
            address: {
              street: '',
              city: '',
            },
          },
        },
        { validate: true },
      );

      assert.deepEqual(model.validationError, {
        'person.name': 'Name is required',
        'person.address.street': 'Street is required',
        'person.address.city': 'City is required',
      });
    });

    it('calls the invalid callback for nested paths', () => {
      const invalid = vi.fn();

      model.set(
        {
          person: {
            name: '',
            address: {
              street: '',
              city: '',
            },
          },
        },
        { validate: true, invalid } as any,
      );

      assert.deepEqual(
        invalid.mock.calls.map(([path, message]) => [path, message]),
        [
          ['person.name', 'Name is required'],
          ['person.address.street', 'Street is required'],
          ['person.address.city', 'City is required'],
        ],
      );
    });

    it('calls the valid callback for nested paths', () => {
      const valid = vi.fn();

      model.set(
        {
          person: {
            name: 'John',
            address: {
              street: '123 Main St',
              city: 'New York',
            },
          },
        },
        { validate: true, valid } as any,
      );

      assert.deepEqual(
        valid.mock.calls.map(([path]) => path),
        ['person.name', 'person.address.street', 'person.address.city'],
      );
    });

    it('supports nested paths in isValid', () => {
      model.set({
        person: {
          name: 'John',
          address: {
            street: '',
            city: 'New York',
          },
        },
      });

      assert.isTrue(model.isValid('person.name'));
      assert.isFalse(model.isValid('person.address.street'));
    });

    it('supports nested paths in preValidate without mutating the model', () => {
      model.set({
        person: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'New York',
          },
        },
      });

      assert.strictEqual(model.preValidate('person.address.street', ''), 'Street is required');
      assert.strictEqual(model.get('person')?.address?.street, '123 Main St');
    });

    it('filters validation to nested paths through options.attributes', () => {
      model.set({
        person: {
          name: '',
          address: {
            street: '',
            city: '',
          },
        },
      });

      assert.deepEqual(model.validate(undefined, { attributes: ['person.address.street'] }), {
        'person.address.street': 'Street is required',
      });
    });
  });

  describe('arrays', () => {
    class ArrayModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        tags: z.array(z.string()).min(1, 'At least one tag required'),
        scores: z.array(z.number()).max(5, 'Maximum 5 scores'),
      });
    }

    let model: ArrayModel;

    beforeEach(() => {
      model = new ArrayModel();
    });

    it('validates valid arrays', () => {
      model.set(
        {
          tags: ['tag1', 'tag2'],
          scores: [10, 20, 30],
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates empty array when min is set', () => {
      model.set(
        {
          tags: [],
          scores: [1],
        },
        { validate: true },
      );

      assert.isDefined(model.validationError);
      assert.isFalse(model.isValid());
    });

    it('validates array exceeding max', () => {
      model.set(
        {
          tags: ['tag1'],
          scores: [1, 2, 3, 4, 5, 6],
        },
        { validate: true },
      );

      assert.isDefined(model.validationError);
      assert.isFalse(model.isValid());
    });
  });

  describe('optional fields', () => {
    class OptionalFieldModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
        nickname: z.string().optional(),
        age: z.number().optional(),
      });
    }

    let model: OptionalFieldModel;

    beforeEach(() => {
      model = new OptionalFieldModel();
    });

    it('validates with required field only', () => {
      model.set({ name: 'John' }, { validate: true });

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates with all fields including optional', () => {
      model.set(
        {
          name: 'John',
          nickname: 'Johnny',
          age: 25,
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates with undefined optional fields', () => {
      model.set(
        {
          name: 'John',
          nickname: undefined,
          age: undefined,
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });
  });

  describe('nullable fields', () => {
    class NullableFieldModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        name: z.string().min(1, 'Name is required'),
        description: z.string().nullable(),
      });
    }

    let model: NullableFieldModel;

    beforeEach(() => {
      model = new NullableFieldModel();
    });

    it('validates null value for nullable field', () => {
      model.set(
        {
          name: 'John',
          description: null,
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates string value for nullable field', () => {
      model.set(
        {
          name: 'John',
          description: 'A description',
        },
        { validate: true },
      );

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });
  });

  describe('union types', () => {
    class UnionModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        value: z.union([z.string(), z.number()]),
      });
    }

    let model: UnionModel;

    beforeEach(() => {
      model = new UnionModel();
    });

    it('validates string in union', () => {
      model.set({ value: 'hello' }, { validate: true });

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('validates number in union', () => {
      model.set({ value: 42 }, { validate: true });

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('rejects invalid type in union', () => {
      model.set({ value: true }, { validate: true });

      assert.isDefined(model.validationError);
      assert.isFalse(model.isValid());
    });
  });

  describe('enum validation', () => {
    class EnumModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        status: z.enum(['active', 'inactive', 'pending']),
      });
    }

    let model: EnumModel;

    beforeEach(() => {
      model = new EnumModel();
    });

    it('validates valid enum value', () => {
      model.set({ status: 'active' }, { validate: true });

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('rejects invalid enum value', () => {
      model.set({ status: 'unknown' }, { validate: true });

      assert.isDefined(model.validationError);
      assert.isFalse(model.isValid());
    });
  });

  describe('custom error messages', () => {
    class CustomErrorModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        email: z.string().email('Please enter a valid email address'),
        age: z.number().min(18, 'You must be at least 18 years old'),
      });
    }

    let model: CustomErrorModel;

    beforeEach(() => {
      model = new CustomErrorModel();
    });

    it('returns custom error message for invalid email', () => {
      const errors = model.preValidate('email', 'invalid');

      assert.strictEqual(errors, 'Please enter a valid email address');
    });

    it('returns custom error message for invalid age', () => {
      const errors = model.preValidate('age', 10);

      assert.strictEqual(errors, 'You must be at least 18 years old');
    });
  });

  describe('refine validation', () => {
    class RefineModel extends withSchema(Model<ComplexAttributes>) {
      static schema = z.object({
        password: z
          .string()
          .min(8, 'Password must be at least 8 characters')
          .refine((value) => /[A-Z]/.test(value), {
            message: 'Password must contain an uppercase letter',
          }),
      });
    }

    let model: RefineModel;

    beforeEach(() => {
      model = new RefineModel();
    });

    it('validates password with all requirements', () => {
      model.set({ password: 'MyPassword123' }, { validate: true });

      assert.isNull(model.validationError);
      assert.isTrue(model.isValid());
    });

    it('rejects password too short', () => {
      const errors = model.preValidate('password', 'Short');

      assert.isDefined(errors);
    });

    it('rejects password without uppercase', () => {
      const errors = model.preValidate('password', 'lowercase123');

      assert.isDefined(errors);
    });
  });
});

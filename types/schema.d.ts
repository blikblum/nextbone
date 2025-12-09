export type Ctor<T> = new (...args: any[]) => T;
export type ZodSchema = z.ZodObject<any>;
export type SchemaStaticMixin = {
    schema: ZodSchema;
};
/**
 * @typedef SchemaStaticMixin
 * @property {ZodSchema} schema
 */
/**
 * A mixin/decorator that adds Zod schema-based validation to a Model class.
 * The schema should be defined as a static `schema` property on the Model class.
 *
 * @example
 * // Function style
 * class UserModel extends withSchema(Model) {
 *   static schema = z.object({
 *     name: z.string().min(1, 'Name is required'),
 *     email: z.string().email('Invalid email'),
 *     age: z.number().min(0).optional(),
 *   });
 * }
 *
 * @example
 * // Decorator style
 * @withSchema
 * class UserModel extends Model {
 *   static schema = z.object({
 *     name: z.string().min(1, 'Name is required'),
 *     email: z.string().email('Invalid email'),
 *   });
 * }
 *
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & SchemaStaticMixin}
 */
export function withSchema<BaseClass extends Ctor<Model<any, any, any>>>(ctorOrDescriptor: BaseClass): BaseClass & SchemaStaticMixin;
export namespace defaultOptions {
    let valid: Function;
    let invalid: Function;
}
import type { z } from 'zod';
import type { Model } from './nextbone.js';
//# sourceMappingURL=schema.d.ts.map
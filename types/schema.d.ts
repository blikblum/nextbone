export type Ctor<T> = new (...args: any[]) => T;
export type ZodSchema = z.ZodObject<any>;
export type AttributesMap = Record<string, any>;
export type PathList = string[];
export type SchemaShape = Record<string, z.ZodType>;
export type ValidationErrorMap = Record<string, string>;
export type ValidCallback = (attr: string, model: Model) => void;
export type InvalidCallback = (attr: string, message: string, model: Model) => void;
export type ValidationOptions = {
    validate?: boolean | undefined;
    attributes?: PathList | undefined;
    valid?: ValidCallback | undefined;
    invalid?: InvalidCallback | undefined;
};
export type SchemaInstanceMixin = {
    preValidate: (attr: string | AttributesMap, value?: any) => string | ValidationErrorMap | undefined;
    isValid: (opts?: string | PathList | ValidationOptions) => boolean;
    validate: (attrs?: AttributesMap | null, options?: ValidationOptions) => ValidationErrorMap | undefined;
};
export type SchemaStaticMixin = {
    schema: ZodSchema;
};
export type SchemaMixinClass<BaseClass extends Ctor<Model<any, any, any>>> = (new (...args: ConstructorParameters<BaseClass>) => InstanceType<BaseClass> & SchemaInstanceMixin) & SchemaStaticMixin;
/**
 * @typedef {object} SchemaInstanceMixin
 * @property {(attr: string|AttributesMap, value?: any) => string|ValidationErrorMap|undefined} preValidate
 * @property {(opts?: string|PathList|ValidationOptions) => boolean} isValid
 * @property {(attrs?: AttributesMap|null, options?: ValidationOptions) => ValidationErrorMap|undefined} validate
 */
/**
 * @typedef SchemaStaticMixin
 * @property {ZodSchema} schema
 */
/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @typedef {(new (...args: ConstructorParameters<BaseClass>) => InstanceType<BaseClass> & SchemaInstanceMixin) &
 *   SchemaStaticMixin} SchemaMixinClass
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
 * @returns {SchemaMixinClass<BaseClass>}
 */
export function withSchema<BaseClass extends Ctor<Model<any, any, any>>>(ctorOrDescriptor: BaseClass): SchemaMixinClass<BaseClass>;
import type { z } from 'zod';
import type { Model } from './nextbone.js';
//# sourceMappingURL=schema.d.ts.map
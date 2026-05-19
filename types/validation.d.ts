export type Ctor<T> = new (...args: any[]) => T;
export type FnRule = (this: Model<any, string, any>, value: any, attr: string, computed: Record<string, any>) => any;
export type ValidationRule = {
    /**
     * - If the attribute is required or not
     */
    required?: boolean | FnRule | undefined;
    /**
     * - If the attribute has to be accepted
     */
    acceptance?: boolean | FnRule | undefined;
    /**
     * - The minimum value for the attribute
     */
    min?: number | FnRule | undefined;
    /**
     * - The maximum value for the attribute
     */
    max?: number | FnRule | undefined;
    /**
     * - The range for the attribute]
     */
    range?: number[] | FnRule | undefined;
    /**
     * - The length for the attribute
     */
    length?: number | FnRule | undefined;
    /**
     * - The minimum length for the attribute
     */
    minLength?: number | FnRule | undefined;
    /**
     * - The maximum length for the attribute
     */
    maxLength?: number | FnRule | undefined;
    /**
     * - The range for the length of the attribute
     */
    rangeLength?: number[] | FnRule | undefined;
    /**
     * - The allowed values for the attribute
     */
    oneOf?: string[] | FnRule | undefined;
    /**
     * - The name of the attribute to compare with
     */
    equalTo?: string | FnRule | undefined;
    /**
     * - The pattern to match the attribute against
     */
    pattern?: string | RegExp | FnRule | undefined;
    /**
     * - The error message to display if the validation fails
     */
    msg?: string | undefined;
    /**
     * - A custom function used for validation
     */
    fn?: FnRule | undefined;
};
export type ValidationRules = Record<string, ValidationRule>;
export type AttributesMap = Record<string, any>;
export type ValidationErrorMap = Record<string, string>;
export type ValidatorFunction = (value: any, attr: string, ruleValue: string | number | boolean | RegExp | Array<any> | Function, model: typeof Model, computed: Record<string, any>) => string | false | undefined;
export type ValidationInstanceMixin = {
    preValidate: (attr: string | AttributesMap, value?: any) => string | false | ValidationErrorMap | undefined;
    isValid: (opts?: any) => boolean;
    validate: (attrs?: AttributesMap | null, setOptions?: any) => ValidationErrorMap | undefined;
};
export type ValidationStaticMixin = {
    validation: ValidationRules;
};
export type ValidationMixinClass<BaseClass extends Ctor<Model<any, any, any>>> = (new (...args: ConstructorParameters<BaseClass>) => InstanceType<BaseClass> & ValidationInstanceMixin) & ValidationStaticMixin;
/**
 * @typedef {object} ValidationInstanceMixin
 * @property {(attr: string|AttributesMap, value?: any) => string|false|ValidationErrorMap|undefined} preValidate
 * @property {(opts?: any) => boolean} isValid
 * @property {(attrs?: AttributesMap|null, setOptions?: any) => ValidationErrorMap|undefined} validate
 */
/**
 * @typedef ValidationStaticMixin
 * @property {ValidationRules} validation
 */
/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @typedef {(new (...args: ConstructorParameters<BaseClass>) =>
 *   InstanceType<BaseClass> & ValidationInstanceMixin) &
 *   ValidationStaticMixin} ValidationMixinClass
 */
/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {ValidationMixinClass<BaseClass>}
 */
export function withValidation<BaseClass extends Ctor<Model<any, any, any>>>(ctorOrDescriptor: BaseClass): ValidationMixinClass<BaseClass>;
export namespace labelFormatters {
    function none(attrName: any): any;
    function sentenceCase(attrName: any): any;
    function label(attrName: any, model: any): any;
}
/**
 * @type {Record<string, string>}
 */
export var messages: Record<string, string>;
/**
 * @typedef {(value: any, attr: string, ruleValue: string | number | boolean | RegExp | Array<any> | Function, model: typeof Model, computed: Record<string, any>) => string|false|undefined} ValidatorFunction
 * @type {Record<string, ValidatorFunction>}
 */
export var validators: Record<string, ValidatorFunction>;
/**
 * @type {Record<string, RegExp>}
 */
export var patterns: Record<string, RegExp>;
export namespace options {
    let labelFormatter: string;
}
import type { Model } from 'nextbone';
//# sourceMappingURL=validation.d.ts.map
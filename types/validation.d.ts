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
export type ValidationStaticMixin = {
    validation: ValidationRules;
};
/**
 * @typedef ValidationStaticMixin
 * @property {ValidationRules} validation
 */
/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & ValidationStaticMixin}
 */
export function withValidation<BaseClass extends Ctor<Model<any, any, any>>>(ctorOrDescriptor: BaseClass): BaseClass & ValidationStaticMixin;
export namespace labelFormatters {
    function none(attrName: any): any;
    function sentenceCase(attrName: any): any;
    function label(attrName: any, model: any): any;
}
export namespace messages {
    let required: string;
    let acceptance: string;
    let min: string;
    let max: string;
    let range: string;
    let length: string;
    let minLength: string;
    let maxLength: string;
    let rangeLength: string;
    let oneOf: string;
    let equalTo: string;
    let digits: string;
    let number: string;
    let email: string;
    let url: string;
    let inlinePattern: string;
}
export namespace validators {
    function format(text: any, ...args: any[]): any;
    function formatLabel(attrName: any, model: any): any;
}
export namespace patterns {
    let digits_1: RegExp;
    export { digits_1 as digits };
    let number_1: RegExp;
    export { number_1 as number };
    let email_1: RegExp;
    export { email_1 as email };
    let url_1: RegExp;
    export { url_1 as url };
}
export namespace options {
    let labelFormatter: string;
}
import type { Model } from './nextbone.js';
//# sourceMappingURL=validation.d.ts.map
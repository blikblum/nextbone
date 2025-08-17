export type ComputedStaticMixin = {
    computed: ComputedDefs;
};
export type Ctor<T> = new (...args: any[]) => T;
export type ComputedFieldGet = (fields: Record<string, any>) => any;
export type ComputedField = {
    depends: string[];
    get: ComputedFieldGet;
    /**
     * Not possible to use rest params here: https://github.com/Microsoft/TypeScript/issues/15190
     */
    set: (value: any, fields: Record<string, any>) => any;
};
export type ShortHandComputedField1 = [string, ComputedFieldGet];
export type ShortHandComputedField2 = [string, string, ComputedFieldGet];
export type ShortHandComputedField3 = [string, string, string, ComputedFieldGet];
export type ShortHandComputedField4 = [string, string, string, string, ComputedFieldGet];
export type ShortHandComputedField5 = [string, string, string, string, string, ComputedFieldGet];
export type ShortHandComputedField6 = [string, string, string, string, string, string, ComputedFieldGet];
export type ShortHandComputedField = ShortHandComputedField1 | ShortHandComputedField2 | ShortHandComputedField3 | ShortHandComputedField4 | ShortHandComputedField5 | ShortHandComputedField6;
export type ComputedDefs = Record<string, ComputedField | ShortHandComputedField>;
/**
 * @typedef ComputedStaticMixin
 * @property {ComputedDefs} computed
 */
/**
 * @template {Ctor<Model<any, any, any>>} BaseClass
 * @param {BaseClass} ctorOrDescriptor - Base model class
 * @returns {BaseClass & ComputedStaticMixin}
 */
export function withComputed<BaseClass extends Ctor<Model<any, any, any>>>(ctorOrDescriptor: BaseClass): BaseClass & ComputedStaticMixin;
import type { Model } from './nextbone.js';
//# sourceMappingURL=computed.d.ts.map
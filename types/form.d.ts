export function getPath(object: any, path: string): any;
export function setPath(object: any, path: string, value: any): void;
export function getPathChange(obj: any, path: any, value: any): any[];
export class FormState {
    /**
     * @param {HTMLElement} el
     * @param {FormStateOptions} options
     */
    constructor(el: HTMLElement, { model, updateMethod, inputs, events }?: FormStateOptions);
    _data: {};
    _attributes: Set<any>;
    _modelInstance: any;
    el: HTMLElement;
    model: string | Model;
    events: {
        event: string;
        selector: string;
    }[];
    updateMethod: string;
    get modelInstance(): any;
    acceptInput(prop: any, event: any): boolean;
    getAttributes(): any[];
    __selector: string;
    get(attr: any, { meta }?: {
        meta: any;
    }): any;
    set(attr: any, value: any, { meta, reset, silent }?: {
        meta: any;
        reset: any;
        silent: any;
    }): void;
    _ensureInitialData(model: any): void;
    /**
     * @param {string} attr
     * @returns {any}
     * @deprecated
     * @see FormState#get
     */
    getValue(attr: string): any;
    /**
     * @param {string} attr
     * @param {any} value
     * @returns {void}
     * @deprecated
     * @see FormState#set
     */
    setValue(attr: string, value: any): void;
    /**
     * @param {string} prop
     * @returns {any}
     * @see FormState#getData
     * @see FormState#getValue
     * @see FormState#get
     * @see FormState#getValue
     */
    getData(prop: string): any;
    /**
     * @param {string} prop
     * @param {*} value
     */
    setData(prop: string, value: any): void;
    /**
     * @return {boolean}
     */
    isDirty(): boolean;
    /**
     * @returns {string[]}
     */
    getDirtyAttributes(): string[];
    /**
     * @param {Object} options
     * @param {string[]} [options.attributes]
     * @param {boolean} [options.update]
     * @param {boolean} [options.touch]
     * @returns {boolean}
     */
    isValid({ attributes, update, touch }?: {
        attributes?: string[];
        update?: boolean;
        touch?: boolean;
    }): boolean;
    loadInitialData(): void;
    reset(): void;
    errors: {};
    touched: {};
    modelInitialData: WeakMap<object, any>;
}
export function registerFormat(name: any, fn: any): void;
export function registerInput(selector: any, events: any): void;
export function form(optionsOrCtorOrDescriptor: FormStateOptions, options: any): ClassDecorator;
export type FormStateOptions = {
    model?: string | Model;
    updateMethod?: string;
    inputs?: Record<string, string[]>;
    events?: Array<{
        event: string;
        selector: string;
    }>;
};
import type { Model } from './nextbone.js';
import type { Model as Model_1 } from './nextbone.js';
//# sourceMappingURL=form.d.ts.map
export function getPath(object: any, path: string): any;
export function setPath(object: any, path: string, value: any): void;
export function getPathChange(obj: any, path: any, value: any): any[];
export class FormState {
    /**
     * @param {HTMLElement} el
     * @param {FormStateOptions} options
     */
    constructor(el: HTMLElement, { model, updateMethod, inputs, events, }?: FormStateOptions);
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
    /**
     * @returns {Model}
     */
    get modelInstance(): Model;
    /**
     * @param {string} prop
     * @param {Event} event
     * @returns {boolean}
     */
    acceptInput(prop: string, event: Event): boolean;
    /**
     * @returns {string[]}
     */
    getAttributes(): string[];
    __selector: string;
    /**
     * @param {string} attr
     * @param {object} options
     * @param {boolean} [options.meta=false] - if true, will return associated metadata
     * @returns
     */
    get(attr: string, { meta }?: {
        meta?: boolean;
    }): any;
    /**
     * @param {string} attr
     * @param {*} value
     * @param {object} options
     * @param {boolean} [options.meta=false] - if true, will set associated metadata
     * @param {boolean} [options.reset=false] - if true, will reset attr error, touched and initial value
     * @param {boolean} [options.silent=false] - if true, will not trigger update
     */
    set(attr: string, value: any, { meta, reset, silent }?: {
        meta?: boolean;
        reset?: boolean;
        silent?: boolean;
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
export function registerFormat(name: string, fn: (value: any) => any): void;
export function registerInput(selector: string, events: string[]): void;
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
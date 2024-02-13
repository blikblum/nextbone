export function getPath(object: any, path: any): any;
export function setPath(object: any, path: any, value: any): void;
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
    model: string | import("./nextbone.js").Model;
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
    getValue(attr: any): any;
    setValue(attr: any, value: any): void;
    getData(prop: any): any;
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
    isValid({ attributes, update, touch }?: {
        attributes?: any[];
        update: any;
        touch: any;
    }): any;
    loadInitialData(): void;
    reset(): void;
    errors: {};
    touched: {};
    modelInitialData: WeakMap<object, any>;
}
export function registerFormat(name: any, fn: any): void;
export function registerInput(selector: any, events: any): void;
export function form(optionsOrCtorOrDescriptor: any, options: any): {
    new (): {
        [x: string]: any;
        form: FormState;
    };
    [x: string]: any;
} | ((ctorOrDescriptor: any) => {
    new (): {
        [x: string]: any;
        form: FormState;
    };
    [x: string]: any;
} | any | {
    kind: any;
    elements: any;
    finisher(ctor: any): {
        new (): {
            [x: string]: any;
            form: FormState;
        };
        [x: string]: any;
    };
}) | {
    kind: any;
    elements: any;
    finisher(ctor: any): {
        new (): {
            [x: string]: any;
            form: FormState;
        };
        [x: string]: any;
    };
};
export type Collection = import('./nextbone.js').Collection;
export type Model = import('./nextbone.js').Model;
export type FormStateOptions = {
    model?: string | Model;
    updateMethod?: string;
    inputs?: Record<string, string[]>;
    events?: Array<{
        event: string;
        selector: string;
    }>;
};
//# sourceMappingURL=form.d.ts.map
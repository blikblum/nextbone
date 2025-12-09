export class Model extends Events {
    constructor(attributes: any, options: any, ...args: any[]);
    isLoading: boolean;
    validationError: any;
    cid: any;
    attributes: {};
    collection: any;
    changed: {};
    preinitialize(): void;
    initialize(): void;
    toJSON(options: any): any;
    get idAttribute(): any;
    _sync(method: any, options: any): any;
    sync(method: any, options: any, requestHandler: any): any;
    get(attr: any): any;
    escape(attr: any): any;
    has(attr: any): boolean;
    matches(attrs: any): boolean;
    set(key: any, val: any, options: any): this;
    _changing: boolean;
    _previousAttributes: any;
    id: any;
    _pending: any;
    unset(attr: any, options: any): this;
    clear(options: any): this;
    hasChanged(attr: any): any;
    changedAttributes(diff: any): any;
    previous(attr: any): any;
    previousAttributes(): any;
    fetch(options: any): any;
    save(key: any, val: any, options: any): any;
    destroy(options: any): any;
    url(): any;
    parse(resp: any, options: any): any;
    clone(): any;
    assign(source: any, options: any): void;
    assignTo(target: any, options: any): void;
    isNew(): boolean;
    isValid(options: any): boolean;
    keys(): string[];
    values(): any[];
    pairs(): [string, any][];
    entries(): [string, any][];
    invert(): any;
    pick(...args: any[]): any;
    omit(...args: any[]): any;
    isEmpty(): boolean;
    _validate(attrs: any, options: any): boolean;
}
export class Collection extends Events {
    [x: symbol]: () => CollectionIterator;
    constructor(models: any, options: any, ...args: any[]);
    isLoading: boolean;
    model: any;
    comparator: any;
    preinitialize(): void;
    initialize(): void;
    toJSON(options: any): any;
    _sync(method: any, options: any): any;
    sync(method: any, options: any): any;
    add(models: any, options: any): any;
    remove(models: any, options: any): any;
    set(models: any, options: any): any;
    length: any;
    reset(models: any, options: any): any;
    push(model: any, options: any): any;
    pop(options: any): any;
    unshift(model: any, options: any): any;
    shift(options: any): any;
    slice(...args: any[]): any;
    get(obj: any): any;
    has(obj: any): boolean;
    at(index: any): any;
    where(attrs: any, firstItem: any): any;
    findWhere(attrs: any): any;
    sort(options: any): this;
    models: any;
    pluck(attr: any): any;
    fetch(options: any): any;
    create(model: any, options: any): any;
    parse(resp: any, options: any): any;
    clone(): any;
    modelId(attrs: any): any;
    values(): CollectionIterator;
    keys(): CollectionIterator;
    entries(): CollectionIterator;
    forEach(iteratee: any, context: any): any;
    each(iteratee: any, context: any): any;
    map(iteratee: any, context: any): any;
    reduce(...args: any[]): any;
    reduceRight(...args: any[]): any;
    find(predicate: any, context: any): any;
    filter(predicate: any, context: any): any;
    reject(predicate: any, context: any): any;
    every(predicate: any, context: any): any;
    some(predicate: any, context: any): any;
    includes(value: any, fromIndex: any): any;
    contains(value: any, fromIndex: any): any;
    max(iteratee: any, context: any): any;
    min(iteratee: any, context: any): any;
    toArray(): any;
    size(): any;
    first(): any;
    take(n: any): any;
    initial(): any;
    last(): any;
    drop(n: any): any;
    without(...args: any[]): any;
    difference(...args: any[]): any;
    indexOf(model: any, fromIndex: any): any;
    lastIndexOf(model: any, fromIndex: any): any;
    findIndex(predicate: any, context: any): any;
    findLastIndex(predicate: any, context: any): any;
    shuffle(): any;
    isEmpty(): boolean;
    sample(n: any): any;
    partition(predicate: any): any;
    groupBy(predicate: any, context: any): any;
    sortBy(predicate: any, context: any): any;
    countBy(predicate: any, context: any): any;
    _reset(): void;
    _byId: {};
    _prepareModel(attrs: any, options: any): any;
    _removeModels(models: any, options: any): any[];
    _isModel(model: any): model is Model;
    _addReference(model: any, options: any): void;
    _removeReference(model: any, options: any): void;
    _onModelEvent(event: any, model: any, collection: any, options: any, ...args: any[]): void;
}
export class Events {
    static extend(obj: any): any;
    on(name: any, callback: any, context: any): this;
    _events: any;
    _listeners: {};
    listenTo(obj: any, name: any, callback: any): this;
    _listeningTo: {};
    _listenId: any;
    off(name: any, callback: any, context: any): this;
    stopListening(obj: any, name: any, callback: any): this;
    once(name: any, callback: any, context: any): this;
    listenToOnce(obj: any, name: any, callback: any): this;
    trigger(name: any, ...args: any[]): this;
}
export class Router extends Events {
    constructor(options: any, ...args: any[]);
    routes: any;
    preinitialize(): void;
    initialize(): void;
    route(route: any, name: any, callback: any): this;
    execute(callback: any, args: any, name: any): void;
    navigate(fragment: any, options: any): this;
    _bindRoutes(): void;
    _routeToRegExp(route: any): RegExp;
    _extractParameters(route: any, fragment: any): any;
}
export class History extends Events {
    static set instance(value: any);
    static get instance(): any;
    static start(): void;
    interval: number;
    handlers: any[];
    checkUrl(e: any): boolean;
    location: Location;
    history: globalThis.History;
    atRoot(): boolean;
    matchRoot(): boolean;
    decodeFragment(fragment: any): string;
    getSearch(): string;
    getHash(window: any): any;
    getPath(): string;
    getFragment(fragment: any): any;
    start(options: any): boolean;
    options: any;
    root: any;
    _useHashChange: boolean;
    _usePushState: boolean;
    fragment: any;
    stop(): void;
    route(route: any, callback: any): void;
    loadUrl(fragment: any): boolean;
    navigate(fragment: any, options: any): boolean | void;
    _updateHash(location: any, fragment: any, replace: any): void;
}
export class ValidationError extends Error {
}
export function withEvents(classOrDescriptor: any): {
    new (): {
        [x: string]: any;
    };
    [x: string]: any;
} | {
    kind: any;
    elements: any;
    finisher(BaseClass: any): void;
};
export namespace sync {
    function handler(method: any, model: any, options: any): any;
}
export namespace ajax {
    export function handler_1(options: any): Promise<any>;
    export { handler_1 as handler };
}
export function on(eventName: any): (protoOrDescriptor: any, methodName: any, propertyDescriptor: any) => {
    kind: any;
    placement: any;
    descriptor: any;
    initializer: any;
    key: any;
    finisher(ctor: any): void;
};
export function observable(protoOrDescriptor: any, fieldName: any, propertyDescriptor: any): {
    kind: any;
    placement: any;
    descriptor: any;
    initializer: any;
    key: string | symbol;
    finisher(ctor: any): void;
};
export function view(classOrDescriptor: any): any;
export function eventHandler(eventName: any, selector: any): (protoOrDescriptor: any, methodName: any, propertyDescriptor: any) => {
    kind: any;
    placement: any;
    descriptor: any;
    initializer: any;
    key: any;
    finisher(ctor: any): any;
};
export function state(optionsOrProtoOrDescriptor: any, fieldName: any, options: any): ((protoOrDescriptor: any, realFieldName: any) => /*elided*/ any | {
    kind: any;
    placement: any;
    descriptor: any;
    initializer: any;
    key: string | symbol;
    finisher(ctor: any): any;
}) | {
    kind: any;
    placement: any;
    descriptor: any;
    initializer: any;
    key: string | symbol;
    finisher(ctor: any): any;
};
export function delegate(el: any, eventName: any, selector: any, listener: any, context?: any): any;
export function undelegate(el: any, handler: any): void;
export function isView(el: any): any;
import { cloneObject } from './utils.js';
export function waitLoading(state: any): Promise<any>;
declare class CollectionIterator {
    [x: symbol]: () => this;
    constructor(collection: any, kind: any);
    _collection: any;
    _kind: any;
    _index: number;
    next(): {
        value: any;
        done: boolean;
    };
}
export { eventHandler as event, cloneObject };
//# sourceMappingURL=nextbone.d.ts.map
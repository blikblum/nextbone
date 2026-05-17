export type VirtualCollectionOptions<Params extends Record<string, any> = Record<string, any>> = {
    filter?: ModelFilter<Params> | undefined;
    destroyWith?: Model<any, string, any> | Collection<Model<any, any, any>> | undefined;
    comparator?: CollectionComparator<Model<any, string, any>> | undefined;
    model?: (new (...args: any[]) => Model | ((...args: any[]) => Model)) | undefined;
    params?: Params | undefined;
};
export type ModelFilterFunction<Params extends Record<string, any> = Record<string, any>> = (model: Model, params: Params, index: number) => any;
export type ModelFilter<Params extends Record<string, any> = Record<string, any>> = Record<string, any> | ModelFilterFunction<Params>;
/**
 * @class VirtualCollection
 * @description A virtual collection is a collection that is a filtered view of another collection.
 * @template {Model} [TModel=Model]
 * @template {Record<string, any>} [Params=Record<string, any>]
 * @extends {Collection<TModel>}
 */
export class VirtualCollection<TModel extends Model = Model<any, string, any>, Params extends Record<string, any> = Record<string, any>> extends Collection<TModel> {
    /**
     * @param {Collection | null} [parent]
     * @param {VirtualCollectionOptions<Params>} [options]
     */
    constructor(parent?: Collection | null, options?: VirtualCollectionOptions<Params>);
    /** @type {Collection} */
    _parent: Collection;
    _queueFilterUpdate: () => any;
    /** @type {Params} */
    _params: Params;
    accepts: any;
    set parent(value: Collection);
    /**
     * @type {Collection}
     */
    get parent(): Collection;
    /** @param {Params} value */
    set params(params: Params);
    /** @returns {Params} */
    get params(): Params;
    /**
     * @param {ModelFilter<Params>} [filter]
     * @returns {VirtualCollection}
     */
    updateFilter(filter?: ModelFilter<Params>): VirtualCollection;
    _rebuildIndex(): void;
    orderViaParent(options: any): void;
    _onSort(collection: any, options: any): void;
    _proxyParentEvents(collection: any, events: any): void;
    _clearChangesCache(): void;
    _changeCache: {
        added: never[];
        removed: never[];
        merged: never[];
    } | undefined;
    _onUpdate(collection: any, options: any): void;
    _onAdd(model: any, collection: any, options: any): void;
    _onRemove(model: any, collection: any, options: any): void;
    _onChange(model: any, options: any): void;
    _onReset(collection: any, options: any): void;
    _onFilter(collection: any, options: any): void;
    sortedIndex(model: any, value: any, context: any): any;
    _indexAdd(model: any): void;
    _indexRemove(model: any): number;
    _onAllEvent(eventName: any, ...args: any[]): void;
    clone(): any;
}
export function buildFilter(options: any): any;
import type { Model } from './nextbone.js';
import { Collection } from './nextbone.js';
import type { CollectionComparator } from './nextbone.js';
//# sourceMappingURL=virtualcollection.d.ts.map
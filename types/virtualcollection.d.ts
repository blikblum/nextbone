export type VirtualCollectionOptions = {
    filter?: ModelFilter | undefined;
    destroyWith?: Model<any, string, any> | Collection<Model<any, any, any>> | undefined;
    comparator?: CollectionComparator<Model<any, string, any>> | undefined;
    model?: (new (...args: any[]) => Model | ((...args: any[]) => Model)) | undefined;
};
export type ModelFilterFunction = (model: Model) => any;
export type ModelFilter = Record<string, any> | ModelFilterFunction;
/**
 * @class VirtualCollection
 * @description A virtual collection is a collection that is a filtered view of another collection.
 */
export class VirtualCollection extends Collection<Model<any, any, any>> {
    /**
     * @param {Collection | null} [parent]
     * @param {VirtualCollectionOptions} [options]
     */
    constructor(parent?: Collection | null, options?: VirtualCollectionOptions);
    /** @type {Collection} */
    _parent: Collection;
    accepts: any;
    set parent(value: Collection);
    /**
     * @type {Collection}
     */
    get parent(): Collection;
    /**
     * @param {ModelFilter} [filter]
     * @returns {VirtualCollection}
     */
    updateFilter(filter?: ModelFilter): VirtualCollection;
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
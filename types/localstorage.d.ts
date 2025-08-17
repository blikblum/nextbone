/** Generate a pseudo-guid
 * @returns {string} A GUID-like string.
 */
export function guid(): string;
export function bindLocalStorage(instance: any, name: any, { serializer, initialData }?: {}): void;
export function localStorage(name: any, options: any): (ctorOrDescriptor: any) => {
    new (...args: any[]): {
        [x: string]: any;
    };
    [x: string]: any;
} | {
    kind: any;
    elements: any;
    finisher(ctor: any): {
        new (...args: any[]): {
            [x: string]: any;
        };
        [x: string]: any;
    };
};
//# sourceMappingURL=localstorage.d.ts.map
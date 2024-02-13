export function withComputed(ctorOrDescriptor: any): {
    new (...args: any[]): {
        [x: string]: any;
        computedFields: ComputedFields;
        toJSON(...args: any[]): any;
        [excludeFromJSONKey]: any;
    };
    [x: string]: any;
} | {
    kind: any;
    elements: any;
    finisher(ctor: any): {
        new (...args: any[]): {
            [x: string]: any;
            computedFields: ComputedFields;
            toJSON(...args: any[]): any;
            [excludeFromJSONKey]: any;
        };
        [x: string]: any;
    };
};
declare class ComputedFields {
    constructor(model: any, fields: any);
    model: any;
    _bindModelEvents(fields: any): void;
}
declare const excludeFromJSONKey: unique symbol;
export {};
//# sourceMappingURL=computed.d.ts.map
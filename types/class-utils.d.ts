export interface AsyncMethodHost {
    start?(): unknown;
    onError?(error: unknown): unknown;
}
export type AsyncMethodDescriptor<This extends AsyncMethodHost = AsyncMethodHost> = TypedPropertyDescriptor<(this: This, ...args: any[]) => any>;
export interface AsyncMethodSpec<This extends AsyncMethodHost = AsyncMethodHost> {
    descriptor: AsyncMethodDescriptor<This>;
}
export declare function asyncMethod<This extends AsyncMethodHost>(protoOrDescriptor: AsyncMethodSpec<This>): AsyncMethodSpec<This>;
export declare function asyncMethod<This extends AsyncMethodHost>(protoOrDescriptor: object, methodName: string, propertyDescriptor: AsyncMethodDescriptor<This>): void;
export declare const defineAsyncMethods: <T extends abstract new (...args: any[]) => AsyncMethodHost>(klass: T, methodNames: Array<Extract<keyof InstanceType<T>, string>>) => void;
export declare const createWatchedProxy: <T extends object>(target: T, onChange: () => unknown) => T;
export declare const createMicrotaskBatcher: <Result>(task: () => Result | PromiseLike<Result>) => (() => Promise<Awaited<Result>>);
//# sourceMappingURL=class-utils.d.ts.map
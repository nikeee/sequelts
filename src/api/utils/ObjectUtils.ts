type _<T> = T;
export type Merge<T> = _<{ [K in keyof T]: T[K] }>;

export type IsNever<T> = [T] extends [never] ? true : never;

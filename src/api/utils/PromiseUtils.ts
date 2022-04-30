
/** Unpacks any nested Promise types like `Promise<T>` or `Promise<Promise<T>>` and returns `Promise<Target>` (or just `Target` if it's not a promise) */
export type UnpackPromiseAndReplaceInner<T, Target> = T extends Promise<infer Inner>
    ? Promise<UnpackPromiseAndReplaceInner<Inner, Target>>
    : Target

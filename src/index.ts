import type { Parse, DeriveTypedSchema, Trim, UnpackPromiseAndReplaceInner } from "./api/index";
import type { QueryResultType, QueryResultTypeArray, QueryResultTypeIterableIterator, SchemaType } from "./api/Inference";
export type { DeriveTypedSchema } from "./api";

// TODO: Clean up this mess

type ParseSchemaIfNeeded<T extends string | SchemaType> =
    T extends string ? DeriveTypedSchema<T> : T;

type SchemaScopedQueryResult<
    TSchema extends string | SchemaType,
    TQuery extends string,
    TResult,
> =
    UnpackPromiseAndReplaceInner<
        TResult,
        QueryResultType<ParseSchemaIfNeeded<TSchema>, Parse<Trim<TQuery>>>
    >

type SchemaScopedQueryResultArray<
    TSchema extends string | SchemaType,
    TQuery extends string,
    TResult,
> =
    UnpackPromiseAndReplaceInner<
        TResult,
        QueryResultTypeArray<ParseSchemaIfNeeded<TSchema>, Parse<Trim<TQuery>>>
    >

type SchemaScopedQueryResultIterableIterator<
    TSchema extends string | SchemaType,
    TQuery extends string,
    TResult,
> =
    UnpackPromiseAndReplaceInner<
        TResult,
        QueryResultTypeIterableIterator<ParseSchemaIfNeeded<TSchema>, Parse<Trim<TQuery>>>
    >

export function createQuerySingleFunction<TSchema extends string | SchemaType, TRest = unknown>(
    inner: (...q: [string, ...TRest[]]) => unknown,
    _schema?: TSchema, /* Only there to infer the type */
): <TQuery extends string>(query: TQuery, ...params: TRest[]) => SchemaScopedQueryResult<TSchema, TQuery, ReturnType<typeof inner>> {
    return inner as unknown as <TQuery extends string>(query: TQuery) => SchemaScopedQueryResult<TSchema, TQuery, ReturnType<typeof inner>>;
}

export function createQueryAllFunction<TSchema extends string | SchemaType, TRest = unknown>(
    inner: (...q: [string, ...TRest[]]) => unknown,
    _schema?: TSchema, /* Only there to infer the type */
): <TQuery extends string>(query: TQuery, ...params: TRest[]) => SchemaScopedQueryResultArray<TSchema, TQuery, ReturnType<typeof inner>> {
    return inner as unknown as <TQuery extends string>(query: TQuery) => SchemaScopedQueryResultArray<TSchema, TQuery, ReturnType<typeof inner>>;
}

export function createQueryIteratorFunction<TSchema extends string | SchemaType, TRest = unknown>(
    inner: (...q: [string, ...TRest[]]) => unknown,
    _schema?: TSchema, /* Only there to infer the type */
): <TQuery extends string>(query: TQuery, ...params: TRest[]) => SchemaScopedQueryResultIterableIterator<TSchema, TQuery, ReturnType<typeof inner>> {
    return inner as unknown as <TQuery extends string>(query: TQuery) => SchemaScopedQueryResultIterableIterator<TSchema, TQuery, ReturnType<typeof inner>>;
}

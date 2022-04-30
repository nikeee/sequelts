import type { FieldSpecifier, Identifier, MemberExpression, SelectStatement, TableSpecifier } from "./AST";
import type { IsNever } from "./utils";

export type TableName = string;
export type TableSchema = Record<string, unknown>;
export type SchemaType = Record<TableName, TableSchema>

type ProcessableStatement = SelectStatement;

export type QueryResultType<Schema extends SchemaType, Query extends ProcessableStatement> = {
    [Field in ExtractResultFields<Query>]: InferTypeOfQueryFieldInSchema<Schema, Query, GetIdentifierFromFieldName<Query, Field>>
};

export type QueryResultTypeArray<Schema extends SchemaType, Query extends ProcessableStatement> = ReadonlyArray<QueryResultType<Schema, Query>>;
export type QueryResultTypeIterableIterator<Schema extends SchemaType, Query extends ProcessableStatement> = IterableIterator<QueryResultType<Schema, Query>>;

type ExtractResultFields<Query extends ProcessableStatement> =
    Query["fields"][number]["alias"]["name"];

type GetIdentifierFromFieldName<Query extends ProcessableStatement, Field extends string> =
    Extract<Query["fields"][number], FieldSpecifier<any, Identifier<Field>>>

type GetTableSpecifierByAlias<Query extends ProcessableStatement, TableName extends string> =
    Extract<Query["joins"][number]["from"], TableSpecifier<any, Identifier<TableName>>>

type GetTableSpecifierBySource<Query extends ProcessableStatement, TableName extends string> =
    Extract<Query["joins"][number]["from"], TableSpecifier<Identifier<TableName>, any>>


// TODO: Union the FROM and JOIN specifiers and match types on that instead
// TODO: Support more than one JOIN (the parser does not seem to parse multiple joins)
type InferTypeOfQueryFieldInSchema<Schema extends SchemaType, Query extends ProcessableStatement, FieldIdentifier extends FieldSpecifier> =
    FieldIdentifier["source"] extends MemberExpression<infer TableName, infer ColumnName>
        ? Schema[TableName][ColumnName] extends unknown
            ? (
                TableName extends (Query["from"]["alias"]["name"] /* | Query["from"]["source"]["name"] */)
                ? Schema[Query["from"]["source"]["name"]][ColumnName]
                : (
                    TableName extends Query["joins"][number]["from"]["alias"]["name"]
                    /* check if the table name is an alias of a join */
                    ? Schema[GetTableSpecifierByAlias<Query, TableName>["source"]["name"]][ColumnName]
                    : (
                        /* is it a table name without an alias? */
                        TableName extends Query["joins"][number]["from"]["source"]["name"]
                        ? Schema[GetTableSpecifierBySource<Query, TableName>["source"]["name"]][ColumnName]
                        : never
                    )
                )
            )
            : Schema[TableName][ColumnName]
        : (
            /* field has no source, we need to check if the column is ambiguous */
            [
                Schema[Query["from"]["source"]["name"]][FieldIdentifier["source"]["name"]],
                Schema[Query["joins"][number]["from"]["source"]["name"]][FieldIdentifier["source"]["name"]],
            ] extends [infer FromName, infer JoinName]
            ? (
                // This part is buggy and needs a rewrite
                IsNever<JoinName> extends true
                    ? /* no join clause */ FromName
                    : (
                        FromName extends JoinName
                        ? (
                            JoinName extends FromName
                                ? unknown // ambiguous column
                                : JoinName & FromName // Field is entirely unknown or one of both
                        )
                        : (
                            JoinName extends FromName
                                ? FromName // There is no JOIN query
                                : JoinName & FromName // Field is entirely unknown or one of both
                        )
                    )

            )
            : never // Cannot happen, just here to capture vars
        );

import type { BinaryOperator, BinaryExpression, BooleanLiteral, Identifier, LogicalOperator, LogicalExpression, NullLiteral, NumericLiteral, SelectStatement, StringLiteral, Expression, FieldSpecifier, UpdateStatement, AssignmentExpression, InsertStatement, DeleteStatement, MemberExpression, TableSpecifier, InnerJoinSpecifier, JoinSpecifier, CreateTableStatement, ColumnSpecifier } from "./AST";
import type { IntegerStrings, Merge, Trim, TrimLeft, TrimRight, WhiteSpace } from "./utils";

export type Parse<T> =
  ParseStatement<Trim<T>> extends [infer Statement, infer Rest] ?
    Trim<Rest> extends ";" ? Statement :
    Trim<Rest> extends "" ? Statement : never :
    never;

type ParseStatement<T> = ParseSelectStatement<T>;

type ParseSelectStatement<T> =
  ParseSelectClause<T> extends Partial<SelectStatement<infer Fields, infer From, infer Joins, infer Where, infer Offset, infer Limit>>
  ? [SelectStatement<Fields, From, Joins, Where, Offset, Limit>, ""]
  : never


type GetTableNames<T extends string> = ParseCreateTableStatementList<T>[number] extends CreateTableStatement<any, any>
  ? ParseCreateTableStatementList<T>[number]["tableName"]["name"]
  : never;

type GetTableDefinition<T extends string, TableName extends string> =
  Extract<ParseCreateTableStatementList<T>[number], CreateTableStatement<Identifier<TableName>, any>>;


type GetColumnNames<T extends string, TableName extends string> = GetTableDefinition<T, TableName>["columns"][number]["name"]["name"];

type GetColumnSpecifier<T extends string, TableName extends string, ColumnName extends string> =
  Extract<GetTableDefinition<T, TableName>["columns"][number], ColumnSpecifier<Identifier<ColumnName>, any>>;
/*
type AASDASD = GetTableNames<`CREATE TABLE user ();CREATE TABLE vote ();`>
type ASASD = GetColumnSpecifier<`CREATE TABLE user (id int, name text);CREATE TABLE vote (id int, user int, name text);`, "user", "id">;
*/

type TableType<T extends string, TableName extends string> = {
  [ColumnName in GetColumnNames<T, TableName>]: GetJsTypeFromColumnSpecifier<GetColumnSpecifier<T, TableName, ColumnName>["typeName"]["name"]>
};

type GetJsTypeFromColumnSpecifier<CS extends string> =
  CS extends ("TEXT" |"CHAR" | "VARCHAR" | "DATE") ? string :
  CS extends ("INT" | "INTEGER" | "FLOAT" | "REAL" | "DECIMAL") ? number :
  "never";

export type DeriveTypedSchema<T extends string> = {
  [TableName in GetTableNames<Trim<T>>]: TableType<Trim<T>, TableName>
};

/*
type ASDF0 = DeriveTypedSchema<`
CREATE TABLE user (id int, name text);
CREATE TABLE vote (id int, user int, name text);
`>;
type asdasdsa = ASDF0["user"]
type ASDF1 = ParseCreateTableStatementList<`CREATE TABLE user (id int, name text);CREATE TABLE vote (id int, name text);`>[number];
type AAAA = ParseCreateTableStatement<`CREATE TABLE user (id int, name text);CREATE TABLE vote (id int, name text);`>
*/

type ParseCreateTableStatementList<T> =
  ParseCreateTableStatement<T> extends [infer CreateTable, infer Rest]
    ? Trim<Rest> extends (";" | "")
      ? [CreateTable]
      : [CreateTable, ...ParseCreateTableStatementList<Trim<Rest, WhiteSpace | ";">>]
    : [];

export type ParseCreateTableStatement<T> =
  T extends `CREATE TABLE ${infer TableName} (${infer Columns})${infer Rest}`
  ? [
      CreateTableStatement<
        ParseIdentifier<TableName>[0],
        ParseColumnSpecifierList<Trim<Columns>>
      >,
      Trim<Rest, WhiteSpace | ";" >,
    ]
  : [];


type ParseColumnSpecifierList<T> =
  T extends (`${infer Head},${infer Tail}` | `${infer Head}, ${infer Tail}`) ?
  Trim<Tail> extends `${infer PreTail})`
    ? [ParseColumnSpecifier<Trim<Head>>, ...ParseColumnSpecifierList<Trim<PreTail>>]
    : [ParseColumnSpecifier<Trim<Head>>, ...ParseColumnSpecifierList<Trim<Tail>>]
  : [ParseColumnSpecifier<Trim<T>>];

type ParseColumnSpecifier<T> =
    T extends `${infer ColumnName} ${infer TypeName}`
    ? ColumnSpecifier<
        ParseIdentifier<ColumnName>[0],
        ParseIdentifier<TypeName>[0]
      >
    : never



type ParseTableSpecifier<T> =
  T extends `${infer Source} AS ${infer Alias}` ? TableSpecifier<Identifier<Source>, Identifier<Alias>> :
  T extends `${infer Source} ${infer Alias}` ? TableSpecifier<Identifier<Source>, Identifier<Alias>> :
  T extends string ? TableSpecifier<Identifier<Trim<T>>> :
  never;

type ParseSelectClause<T>
  = T extends `SELECT ${infer FieldNames} FROM ${infer R0}` ?
    Merge<{fields: ParseFieldSpecifierList<FieldNames>} & ParseFromClause<Trim<R0>>>
  : never;

type ParseFromClause<T> =
  Tokenize<T> extends [infer Source, infer R0] ?
    Tokenize<R0> extends ["AS" | "as", infer R1]
      ? Tokenize<R1> extends [infer Alias, infer R2]
        ? {from: TableSpecifier<Identifier<Source & string>, Identifier<Alias & string>>} & ParseJoinClause<R2>
        : never
      : {from: TableSpecifier<Identifier<Source & string>>} & ParseJoinClause<R0>
  : never;

type ParseJoinClause<T> =
  Trim<T> extends `INNER JOIN ${infer TableName} ON ${infer R0}`
    ? ParseExpression<R0> extends [infer Exp, infer R1]
      ? Exp extends Expression
        ? {joins: [InnerJoinSpecifier<ParseTableSpecifier<TableName>, Exp>]} & ParseWhereClause<Trim<R1>>
        : never
      : never
    : ParseWhereClause<Trim<T>> & {joins: []}

type ParseWhereClause<T> =
  Trim<T> extends ""
    ? { where: BooleanLiteral<true> }
    : Trim<T> extends `WHERE ${infer Where}`
      ? ParseExpression<Where> extends [infer Exp, infer R0]
        ? Exp extends Expression
          ? {where: Merge<Exp>} & ParseLimitClause<R0>
          : never
        : never
      : {where: BooleanLiteral<true>} & ParseLimitClause<Trim<T>>

type ParseLimitClause<T> =
  Trim<T> extends `LIMIT ${infer R0}`
    ? Tokenize<R0> extends [infer Limit, infer R1]
      ? Limit extends keyof IntegerStrings
        ? {limit: IntegerStrings[Limit]} & ParseOffsetClause<R1>
        : never
      : never
    : {limit: -1} & ParseOffsetClause<T>;

type ParseOffsetClause<T> =
  Trim<T> extends `OFFSET ${infer R0}`
    ? Tokenize<R0> extends [infer Offset, infer R1]
      ? Offset extends keyof IntegerStrings
        ? { offset: IntegerStrings[Offset] } & ParseStatementTerminator<R1>
        : never
      : never
    : {offset: 0} & ParseStatementTerminator<T>;


type ParseStatementTerminator<T> =
  Trim<T> extends ""
    ? {}
    : Trim<T> extends ";"
      ? {}
      : never;

type ParseIdentifier<T> =
  T extends "" ? never :
  Tokenize<T> extends [infer Head, infer Tail] ?
    Head extends "" ? never :
    Head extends "null" ? [NullLiteral, Tail] :
    Head extends "true" ? [BooleanLiteral<true>, Tail] :
    Head extends "false" ? [BooleanLiteral<false>, Tail] :
    Head extends keyof IntegerStrings ? [NumericLiteral<IntegerStrings[Head] & number>, Tail] :
    [Identifier<Head & string>, Tail] :
    [Identifier<T & string>, ""];

type ParseMemberExpression<T> =
  Tokenize<T> extends [`${infer O}.${infer P}`, infer Tail] ?
    [MemberExpression<O, P>, Tail]
    : ParseIdentifier<T>;

type ParseStringLiteral<T> =
  T extends `"${infer Value}"${infer Rest}` ? [StringLiteral<Value>, Rest] :
  T extends `"${infer Value}"${infer Rest}` ? [StringLiteral<Value>, Rest] :
  ParseMemberExpression<T>;


type ParseCallExpression<T> =
  Trim<T> extends "" ? never :
  ParseStringLiteral<Trim<T>> | ParseParenthesizedExpression<T>;


type ParseBinaryExpression<T> =
  ParseCallExpression<T> extends [infer Left, infer R1] ?
    Left extends Expression ?
      Tokenize<R1> extends [infer Op, infer R2] ?
        Op extends BinaryOperator ?
          ParseCallExpression<R2> extends [infer Right, infer R3] ?
            Right extends Expression ?
              [BinaryExpression<Left, Op, Right>, R3] :
              never :
            never :
          [Left, R1] :
        [Left, R1] :
      never :
    never;


type ParseLogicalExpression<T> =
  ParseBinaryExpression<T> extends [infer Left, infer R1] ?
    Tokenize<R1> extends [infer Op, infer R2] ?
      Op extends LogicalOperator ?
        ParseExpression<R2> extends [infer Right, infer R3] ?
          Left extends Expression ?
            Right extends Expression ?
              [LogicalExpression<Left, Op, Right>, R3] :
              never :
            never :
          never :
        [Left, R1] :
      [Left, R1] :
    never;


type ParseExpression<T> =
  Trim<T> extends "" ? never :
  ParseLogicalExpression<Trim<T>> | ParseParenthesizedExpression<T>;

type ParseParenthesizedExpression<T> = T extends `(${infer Content})${infer Rest}` ? [ParseExpression<Content>, Rest] : never;

type ParseFieldSpecifierList<T> =
  T extends `${infer Head},${infer Tail}` ? [ParseFieldSpecifier<Trim<Head>>, ...ParseFieldSpecifierList<Trim<Tail>>] :
  T extends `${infer Head} AS ${infer Alias} ${infer Tail}` ? [FieldSpecifier<Trim<ParseMemberExpression<Head>[0]>, Trim<ParseIdentifier<Alias>[0]>>, Tail] :
  T extends `${infer Head} AS ${infer Alias}` ? [FieldSpecifier<Trim<ParseMemberExpression<Head>[0]>, Trim<ParseIdentifier<Alias>[0]>>] :
  T extends `${infer Head} ${infer Tail}` ? [ParseFieldSpecifier<Trim<Head>>, Tail] :
  [ParseFieldSpecifier<Trim<T>>];

type ParseFieldSpecifier<T> =
  T extends `${infer Field} AS ${infer Alias}` ? FieldSpecifier<ParseMemberExpression<Trim<Field>>[0], ParseIdentifier<Trim<Alias>>[0]> :
  ParseMemberExpression<T> extends [infer M, ""] ?
    M extends MemberExpression<infer O, infer P> ? FieldSpecifier<M, Identifier<P>> : M extends Identifier ? FieldSpecifier<M, M> :
  T extends string ? FieldSpecifier<Identifier<T>, Identifier<T>> : never :
  never;


type Tokenize<T> =
  Trim<T> extends `${infer Head} ${infer Tail}` ? [Head, Tail] :
  Trim<T> extends `${infer Head},${infer Tail}` ? [Head, Tail] :
  Trim<T> extends `${infer Head}(${infer Tail}` ? [Head, Tail] :
  Trim<T> extends `${infer Head})${infer Tail}` ? [Head, Tail] :
  Trim<T> extends `${infer Head};${infer Tail}` ? [Head, Tail] :
  Trim<T> extends `${infer Head})` ? [Head, ")"] :
  Trim<T> extends `${infer Head};` ? [Head, ";"] :
  [Trim<T>, ""]
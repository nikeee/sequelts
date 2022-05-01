<div align=center>
  <img src="https://user-images.githubusercontent.com/4068864/166162274-e2e4effa-d5fc-4e87-be87-2a24e19c5c91.gif" alt="sequelts Demo">
</div>

# sequel<i>ts</i>
<blockquote>
  <dl>
    <dt>/ˈsiːkwəlts/</dt>
    <dd>1. Statically typed raw SQL queries</dd>
    <dd>2. Zero run-time overhead</dd>
  </dl>
</blockquote>

https://user-images.githubusercontent.com/4068864/166089033-86b4669d-bfef-4863-8b68-d8e5358d3429.mp4

```diff
- WARNING -

This is a hack and most likely not compatible with the database you are using.
It is not production ready and misses a lot of features.
Consider it a proof-of-concept and expect significantly slower type-checking.
```

This hack is based on and inspired by the awesome work of [ts-sql](https://github.com/codemix/ts-sql) and [sql-template-strings](https://www.npmjs.com/package/sql-template-strings).

## Why?
- I don't like ORMs, they don't let me write SQL
- I don't like code generation, it doesn't let me write SQL
- I don't like query builders, they don't let me write SQL
- SQL is powerful for relational data
- Because hacking on things is fun

## Trying it out
```
npm i -D sequelts
```

Full sample using SQLite (with [better-sqlite3](https://www.npmjs.com/package/better-sqlite3)):
```ts
// npm i -S better-sqlite3
// npm i -D sequelts
import Database from "better-sqlite3";
import { createQueryAllFunction, createQueryIteratorFunction, createQuerySingleFunction } from "sequelts";

const databaseSchema = `
CREATE TABLE user (
    id INT,
    name TEXT
);
CREATE TABLE video (
    id INT,
    user INT,
    title TEXT
);
`;

const db = new Database(":memory:");
db.exec(`
    INSERT INTO user VALUES
        (1, 'user-a'),
        (2, 'user-b'),
        (3, 'user-c')
`);
db.exec(`
    INSERT video VALUES
        (1, 1, 'video-1-user-a'),
        (1, 2, 'video-2-user-a'),
        (1, 3, 'video-3-user-a'),
        (2, 1, 'video-1-user-b');
`);


// Define these functions once for your database driver
const getSingle = createQuerySingleFunction((q, ...p) => db.prepare(q).get(...p), databaseSchema);
const getCursor = createQueryIteratorFunction((q, ...p) => db.prepare(q).iterate(...p), databaseSchema);

// ...use them to get typed results
const user = getSingle("SELECT name FROM user WHERE id = ?", 1);
user.name; // string

const videoIterator = getCursor(
    "SELECT u.id, u.name AS userName, v.title AS videoTitle FROM user AS u INNER JOIN video AS v ON u.id = v.user"
);

for(const v of videoIterator) {
    v.userName; // string
    console.log(v);
}
```

<details>
<summary>More Samples</summary>

If you have your schema as a string literal type in your code (excluding it from the compiled application):
```ts
type DBSchema = `
CREATE TABLE user (
    id INT,
    name TEXT
);
CREATE TABLE video (
    id INT,
    user INT,
    title TEXT
);
`
const getSingle = createQuerySingleFunction<DBSchema>((q, ...p) => db.prepare(q).get(...p));

const video = getSingle("SELECT user, title FROM video WHERE id = ?", 1);
video.user; // number
video.title; // string
```

In case you want to define your schema in terms of TypeScript types:
```ts
type DBSchema = {
    user: {
        id: number;
        name: string;
    };
    video: {
        id: number;
        user: number;
        title: string;
    };
}
const getSingle = createQuerySingleFunction<DBSchema>((q, ...p) => db.prepare(q).get(...p));

const user = getSingle("SELECT name FROM user WHERE id = ?", 1);
user.name; // string
```

You can always derive the DB schema from your `CREATE TABLE` statements in case you need them:
```ts
type DBSchema = DeriveTypedSchema<`
CREATE TABLE user (
    id INT,
    name TEXT
);
CREATE TABLE video (
    id INT,
    user INT,
    title TEXT
);
`>;
// DBSchema["user"]["id"] == number
```

</details>

## What doesn't work (yet?)
- We only support the bare minimum of `CREATE TABLE` for schema creation and `SELECT` for data retrieval. Things like `INSERT`, `UPDATE` and `DELETE` are not supported, because they ([mostly](https://www.postgresql.org/docs/current/dml-returning.html)) don't return data
- No support for lower- or mixed-cased keywords
- No `SELECT *`
- No SQL functions, operators and aggregators: `SELECT AVG(foo) FROM b` or `SELECT bar + baz FROM b` don't work
- No arbitrary whitespace. The parser is written in a way that `SELECT\na` or `SELECT  a` (with two spaces) won't get recognized
- No `FROM <subquery>` support, only tables
- Basically everything that's not part of a join spec is not parsed. Generating the parser from a formal SQL syntax could help
- A lot of stuff I did not stumble over yet
- Parsing and applying nullability like `NOT NULL`
- Support for [`sql-template-strings`](https://www.npmjs.com/package/sql-template-strings)

...so basically everything that would make this project useful. However, it's open for contributions, maybe _you_ are the one fixing this? Also, how about GraphQL? :)

### Limitations
Sequelts requires the queries to be a literal type to parse it at compile-time.

## So, what to do?
Other languages solve this with some kind of [Type Providers](https://docs.microsoft.com/en-us/dotnet/fsharp/tutorials/type-providers/), which are a mix of code generation (as part of the language compiler) and some basic abstraction. [They were proposed for TypeScript](https://github.com/microsoft/TypeScript/issues/3136), but they don't align with the goals of TypeScript.

If you want something that's not a hack, try ome of these:
- [sqltyper](https://github.com/akheron/sqltyper) (manual code-gen for types)
- [ts-sql-query](https://github.com/juanluispaz/ts-sql-query) (query builder)
- [TypeORM](https://github.com/typeorm/typeorm) (class-based ORM, relies on runtime type information)
- [sequelize](https://github.com/sequelize/sequelize) (class-based ORM)
- [Some other options](https://phiresky.github.io/blog/2020/sql-libs-for-typescript/)

There are advantages of using one of the above: Some of them come with automatic schema migration, if you need that.

## How?
This library parses the SQL statements at compile-time and derives JS types that the SQL driver returns.
Sequelts' exported functions just return the functions passed into them.
The only reason they exist is that they are used to apply types to the input function. We use [template string literal types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) for that.

_The user only has to make sure that the SQL library used returns an object corresponding to the SELECTed columns_ (or a Promise of that object/array of objects).

TypeScript's type aliases can be seen from a different angle: Due to numerous additions to the TS type system over time, a type alias is just a function. For example, this alias:
```ts
type Foo = 1;
// ...is equivalent to this JavaScript function:
const Foo = () => 1;
```
A function is "called" as soon as the type alias is used. Generic type parameters are the parameters of a function:
```ts
type Foo<T> = T;
// equivalent to:
const Foo = (T) => T;
```

Taking this further, generic type constraints are the types of the arguments of this function. From there, you can access properties of these types using the indexing syntax `["property"]`:
```ts
type GetLength<T extends Array<unknown>> = T["length"];
// equivalent to:
const GetLength = (T: Array<unknown>) => T.length;

type L0 = GetLength<[1, 2, 3, 4]>; // 4

const L1 = GetLength([1, 2, 3, 4]); // 4
```
The difference is that the type alias is computed at compile time while the JS code does it at runtime.
The value computed by the type alias cannot be used at runtime.
However, it's possible to combine both and provide the rest of the code with more fine-grained types (well, this is what TypeScript is all about).

The final piece of the programming language puzzle is conditional branching. TypeScript somehow had this [some time now](https://github.com/microsoft/TypeScript/issues/14833), using mapped types. In TS 2.8, [conditional types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) were introduced, which made branching even simpler. Not only that, but the conditional types together with the `infer` form a pattern matching mechanism which even supports capturing variables.

```ts
// TODO
```

Types are functions and also types
TODO: Explain?

Conclusion: TypeScript's type system is a small, functional programming language.

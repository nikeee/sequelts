export type MatchStringLike<Left, Right> =
  Right extends `%${infer Content}%` ? MatchString<Left, Content> :
  Right extends `%${infer Content}` ? MatchStringEnd<Left, Content> :
  Right extends `${infer Content}%` ? MatchStringStart<Left, Content> :
  false;


export type EatFirstChar<T> =  T extends `${infer _}${infer B}` ? B : '';

export type MatchStringStart<Candidate, Pattern extends string> =
  Candidate extends Pattern ? true :
  Candidate extends `${Pattern}${infer _}` ? true :
  false;

export type MatchStringEnd<Candidate, Pattern extends string> =
  Candidate extends Pattern ? true :
  Candidate extends `${infer _}${Pattern}` ? true :
  false;

export type MatchString<Candidate, Pattern extends string> =
  Candidate extends '' ? false :
  MatchStringStart<Candidate, Pattern> extends true ? true :
  MatchStringEnd<Candidate, Pattern> extends true ? true :
  MatchString<EatFirstChar<Candidate>, Pattern> extends true ? true :
  false;

export type WhiteSpace = "\n" | " " | "\t";

export type TrimLeft<V, Chars extends string = WhiteSpace> =
    V extends `${Chars}${infer Inner}`
    ? TrimLeft<Inner>
    : V;

export type TrimRight<V, Chars extends string = WhiteSpace> =
    V extends `${infer Inner}${Chars}`
    ? TrimRight<Inner>
    : V;

export type Trim<V, Chars extends string = WhiteSpace> = TrimLeft<TrimRight<V, Chars>, Chars>;

export type JoinStrings<T, Sep = ', '> =
  T extends [infer Head, ...infer Tail]
    ? Tail extends readonly []
      ? Head
      : Tail extends readonly string[]
        ? Head extends ''
          ? JoinStrings<Tail, Sep>
          : JoinStrings<Tail, Sep> extends ''
            ? `${Head & string}`
            : `${Head & string}${Sep & string}${JoinStrings<Tail, Sep>}`
        : `${Head & string}`
      : T extends [infer Head]
        ? `${Head & string}`
        : '';

export type StringContains<Input extends string, Term extends string> =
  Input extends Term ? true :
  Input extends `${Term}${infer _}` ? true :
  Input extends `${infer _0}${Term}${infer _1}` ? true :
  Input extends `${infer _}${Term}` ? true :
  false;

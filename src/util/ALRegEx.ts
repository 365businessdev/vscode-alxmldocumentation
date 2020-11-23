/**
 * Regular Expressions to find AL Object in Source Code.
 */
export const FindALObjectRegEx: RegExp = /^(?<ObjectType>[A-Za-z]*)\b\s+((?<ObjectID>[0-9]+)\b\s)?(?<ObjectName>"(?:[^"\\]|\\.)*"|([A-Za-z0-9]+))\s?((?<ExtensionType>(extends|implements))\s(?<ExtensionObject>.*))?/m;

/**
 * Regular Expressions to find AL Procedures in Source Code.
 */
export const FindALProceduresRegEx: RegExp = /(?<!\/\/\/.*)((local|internal|protected)\s*)?(procedure|trigger)\s+(\")?(.+)\b(\")?\((.*|[^)]+)\).*(?<!\/\/.*)/mg;
export const ALProcedureDefinitionRegEx: RegExp = /(?<!\/\/\/.*)(?<Access>(local|internal|protected)\s*)?(?<Type>(procedure|trigger))\s+(?<ProcedureName>(\")?(.+)\b(\")?)\((?<Params>(.*|[^)]+))\)(?<ReturnType>.*)(?<!\/\/.*)/m;

/**
 * Regular Expressions for AL Source Code.
 */
export const FindBeginEndKeywordRegEx: RegExp = /(?<!\/\/.*)(\bbegin\b|end\;)/;

/**
 * Regular Expression to get Code Reference from inheritdoc comment.
 */
export const InheritDocRegEx: RegExp = /\/\/\/ <inheritdoc cref="(?<CodeReference>.*)"\/>/;
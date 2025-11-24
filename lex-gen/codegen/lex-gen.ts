import { relative as getRelativePath } from "@std/path";
import { type JSDoc, type SourceFile, VariableDeclarationKind } from "ts-morph";
import type {
  LexArray,
  LexBlob,
  LexBytes,
  LexCidLink,
  Lexicons,
  LexIpldType,
  LexObject,
  LexPrimitive,
  LexToken,
} from "@atp/lexicon";
import {
  type CodeGenOptions,
  toCamelCase,
  toScreamingSnakeCase,
  toTitleCase,
} from "./util.ts";
import type { LexiconDoc, LexUserType } from "@atp/lexicon";
import type { ImportMapping } from "../types.ts";

interface Commentable {
  addJsDoc: ({ description }: { description: string }) => JSDoc;
}
export function genComment<T extends Commentable>(
  commentable: T,
  def: { description?: string },
): T {
  if (def.description) {
    commentable.addJsDoc({ description: def.description });
  }
  return commentable;
}

export function genCommonImports(
  file: SourceFile,
  baseNsid: string,
  lexiconDoc: LexiconDoc,
  options?: CodeGenOptions,
) {
  const importExtension = options?.importSuffix ??
    (options?.useJsExtension ? ".js" : ".ts");
  const needsBlobRef = Object.values(lexiconDoc.defs).some((def: LexUserType) =>
    def.type === "blob" ||
    (def.type === "object" &&
      Object.values((def as LexObject).properties || {}).some((prop) =>
        "type" in prop && (prop.type === "blob" ||
          (prop.type === "array" && "items" in prop &&
            prop.items.type === "blob"))
      )) ||
    (def.type === "array" && def.items.type === "blob") ||
    // Check record schema for blobs
    (def.type === "record" &&
      Object.values(def.record.properties || {}).some((prop) =>
        "type" in prop && (prop.type === "blob" ||
          (prop.type === "array" && "items" in prop &&
            prop.items.type === "blob"))
      )) ||
    // Check output schema for blobs
    (def.type === "query" || def.type === "procedure") &&
      def.output?.schema?.type === "object" &&
      Object.values(def.output.schema.properties || {}).some((prop) =>
        "type" in prop && (prop.type === "blob" ||
          (prop.type === "array" && "items" in prop &&
            prop.items.type === "blob"))
      )
  );

  const needsCID = Object.values(lexiconDoc.defs).some((def: LexUserType) =>
    def.type === "cid-link" ||
    (def.type === "object" &&
      Object.values((def as LexObject).properties || {}).some((prop) =>
        "type" in prop && prop.type === "cid-link"
      )) ||
    (def.type === "array" && def.items.type === "cid-link") ||
    // Check record schema for cid-links
    (def.type === "record" &&
      Object.values(def.record.properties || {}).some((prop) =>
        "type" in prop && (prop.type === "cid-link" ||
          (prop.type === "array" && "items" in prop &&
            prop.items.type === "cid-link"))
      )) ||
    // Check output schema for cid-links
    (def.type === "query" || def.type === "procedure") &&
      def.output?.schema?.type === "object" &&
      Object.values(def.output.schema.properties || {}).some((prop) =>
        "type" in prop && (prop.type === "cid-link" ||
          (prop.type === "array" && "items" in prop &&
            prop.items.type === "cid-link"))
      )
  );

  const needsTypedValidation = Object.values(lexiconDoc.defs).some((
    def: LexUserType,
  ) => def.type === "record" || def.type === "object");

  const needsId = Object.values(lexiconDoc.defs).some((
    def: LexUserType,
  ) => def.type === "token") || needsTypedValidation;

  const needsUnionType = Object.values(lexiconDoc.defs).some(
    (def: LexUserType) => {
      // Check direct array unions
      if (def.type === "array" && def.items.type === "union") return true;

      // Check object property unions
      if (def.type === "object") {
        return Object.values((def as LexObject).properties || {}).some((prop) =>
          prop.type === "union" ||
          (prop.type === "array" && prop.items?.type === "union")
        );
      }

      // Check record property unions
      if (def.type === "record") {
        return Object.values(def.record.properties || {}).some((prop) =>
          "type" in prop && (
            prop.type === "union" ||
            (prop.type === "array" && "items" in prop &&
              prop.items.type === "union")
          )
        );
      }

      // Check procedure input/output schemas
      if (def.type === "procedure") {
        // Check input schema
        if (def.input?.schema?.type === "union") return true;
        if (def.input?.schema?.type === "object") {
          return Object.values(def.input.schema.properties || {}).some((prop) =>
            "type" in prop && (
              prop.type === "union" ||
              (prop.type === "array" && "items" in prop &&
                prop.items.type === "union")
            )
          );
        }
        // Check output schema
        if (def.output?.schema?.type === "union") return true;
        if (def.output?.schema?.type === "object") {
          return Object.values(def.output.schema.properties || {}).some((
            prop,
          ) =>
            "type" in prop && (
              prop.type === "union" ||
              (prop.type === "array" && "items" in prop &&
                prop.items.type === "union")
            )
          );
        }
      }

      // Check query output schemas
      if (def.type === "query") {
        if (def.output?.schema?.type === "union") return true;
        if (def.output?.schema?.type === "object") {
          return Object.values(def.output.schema.properties || {}).some((
            prop,
          ) =>
            "type" in prop && (
              prop.type === "union" ||
              (prop.type === "array" && "items" in prop &&
                prop.items.type === "union")
            )
          );
        }
      }

      // Check subscription message schemas
      if (def.type === "subscription") {
        if (def.message?.schema?.type === "union") return true;
        if (def.message?.schema?.type === "object") {
          return Object.values(def.message.schema.properties || {}).some((
            prop,
          ) =>
            "type" in prop && (
              prop.type === "union" ||
              (prop.type === "array" && "items" in prop &&
                prop.items.type === "union")
            )
          );
        }
      }

      return false;
    },
  );

  //= import {BlobRef} from '@atp/lexicon'
  if (needsBlobRef) {
    file.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: "@atp/lexicon",
      namedImports: [{ name: "BlobRef" }],
    });
  }

  //= import {CID} from 'multiformats/cid'
  if (needsCID) {
    file.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: "multiformats/cid",
      namedImports: [{ name: "CID" }],
    });
  }

  const utilPath = `${
    baseNsid
      .split(".")
      .map((_str) => "..")
      .join("/")
  }/util${importExtension}`;

  if (needsTypedValidation) {
    //= import { validate as _validate } from '../../lexicons.ts'
    file
      .addImportDeclaration({
        moduleSpecifier: `${
          baseNsid
            .split(".")
            .map((_str) => "..")
            .join("/")
        }/lexicons${importExtension}`,
      })
      .addNamedImports([{ name: "validate", alias: "_validate" }]);

    //= import type { ValidationResult } from '@atp/lexicon'
    file.addImportDeclaration({
      isTypeOnly: true,
      moduleSpecifier: "@atp/lexicon",
      namedImports: [{ name: "ValidationResult" }],
    });

    // tsc adds protection against circular imports, which hurts bundle size.
    // Since we know that lexicon.ts and util.ts do not depend on the file being
    // generated, we can safely bypass this protection.
    // Note that we are not using `import * as util from '../../util'` because
    // typescript will emit is own helpers for the import, which we want to avoid.
    file.addVariableStatement({
      isExported: false,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        { name: "is$typed", initializer: "_is$typed" },
        { name: "validate", initializer: "_validate" },
      ],
    });
  }

  const utilImports: Array<
    { name: string; alias?: string; isTypeOnly?: boolean }
  > = [];
  if (needsTypedValidation) {
    utilImports.push({ name: "is$typed", alias: "_is$typed" });
  }
  if (needsUnionType) {
    utilImports.push({ name: "$Typed", isTypeOnly: true });
  }

  if (utilImports.length > 0) {
    const allTypeOnly = utilImports.every((imp) => imp.isTypeOnly);
    if (allTypeOnly) {
      file.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: utilPath,
        namedImports: utilImports.map((imp) => ({
          name: imp.name,
          alias: imp.alias,
        })),
      });
    } else {
      file
        .addImportDeclaration({
          moduleSpecifier: utilPath,
        })
        .addNamedImports(utilImports);
    }
  }

  if (needsId) {
    //= const id = "{baseNsid}"
    file.addVariableStatement({
      isExported: false, // Do not export to allow tree-shaking
      declarationKind: VariableDeclarationKind.Const,
      declarations: [{ name: "id", initializer: JSON.stringify(baseNsid) }],
    });
  }
}

export function collectExternalImports(
  lexiconDocs: LexiconDoc[],
  options?: CodeGenOptions,
): Map<string, Set<string>> {
  const imports: Map<string, Set<string>> = new Map();
  const mappings = options?.mappings;

  // Check if any records exist (which use ATP_METHODS)
  const hasRecords = lexiconDocs.some((lexiconDoc) =>
    Object.values(lexiconDoc.defs).some((def) => def.type === "record")
  );

  // Record classes use ATP_METHODS which may need external imports
  // Note: put is commented out in genRecordCls, so we don't import it
  if (hasRecords) {
    const atpMethods = [
      "com.atproto.repo.listRecords",
      "com.atproto.repo.getRecord",
      "com.atproto.repo.createRecord",
      "com.atproto.repo.deleteRecord",
    ];
    for (const methodNsid of atpMethods) {
      const mapping = resolveExternalImport(methodNsid, mappings);
      if (mapping) {
        if (!imports.has(methodNsid)) {
          imports.set(methodNsid, new Set());
        }
        // These methods use QueryParams, InputSchema, etc.
        imports.get(methodNsid)!.add("main");
      }
    }
  }
  return imports;
}

export function genImports(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  baseNsid: string,
  options?: CodeGenOptions,
) {
  const startPath = "/" + baseNsid.split(".").slice(0, -1).join("/");
  const importExtension = options?.importSuffix ??
    (options?.useJsExtension ? ".js" : ".ts");
  const mappings = options?.mappings;

  for (const [nsid, types] of imports) {
    const mapping = resolveExternalImport(nsid, mappings);
    if (mapping) {
      if (typeof mapping.imports === "string") {
        file.addImportDeclaration({
          isTypeOnly: true,
          moduleSpecifier: mapping.imports,
          namedImports: [{ name: toTitleCase(nsid), isTypeOnly: true }],
        });
      } else {
        const result = mapping.imports(nsid);
        if (result.type === "namespace") {
          file.addImportDeclaration({
            isTypeOnly: true,
            moduleSpecifier: result.from,
            namespaceImport: toTitleCase(nsid),
          });
        } else {
          const namedImports = Array.from(types).map((typeName) => ({
            name: toTitleCase(typeName),
            isTypeOnly: true,
          }));
          file.addImportDeclaration({
            isTypeOnly: true,
            moduleSpecifier: result.from,
            namedImports,
          });
        }
      }
    } else {
      const targetPath = "/" + nsid.split(".").join("/") + importExtension;
      let resolvedPath = getRelativePath(startPath, targetPath);
      if (!resolvedPath.startsWith(".")) {
        resolvedPath = `./${resolvedPath}`;
      }
      file.addImportDeclaration({
        isTypeOnly: true,
        moduleSpecifier: resolvedPath,
        namespaceImport: toTitleCase(nsid),
      });
    }
  }
}

export function genUserType(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexicons: Lexicons,
  lexUri: string,
  options?: CodeGenOptions,
) {
  const def = lexicons.getDefOrThrow(lexUri);
  switch (def.type) {
    case "array":
      genArray(file, imports, lexUri, def, options);
      break;
    case "token":
      genToken(file, lexUri, def);
      break;
    case "object": {
      const ifaceName: string = toTitleCase(getHash(lexUri));
      genObject(file, imports, lexUri, def, ifaceName, {
        typeProperty: true,
      }, options);
      genObjHelpers(file, lexUri, ifaceName, {
        requireTypeProperty: false,
      });
      break;
    }

    case "blob":
    case "bytes":
    case "cid-link":
    case "boolean":
    case "integer":
    case "string":
    case "unknown":
      genPrimitiveOrBlob(file, lexUri, def);
      break;

    default:
      throw new Error(
        `genLexUserType() called with wrong definition type (${def.type}) in ${lexUri}`,
      );
  }
}

function genObject(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexUri: string,
  def: LexObject,
  ifaceName: string,
  {
    defaultsArePresent = true,
    allowUnknownProperties = false,
    typeProperty = false,
  }: {
    defaultsArePresent?: boolean;
    allowUnknownProperties?: boolean;
    typeProperty?: boolean | "required";
  } = {},
  options?: CodeGenOptions,
) {
  const iface = file.addInterface({
    name: ifaceName,
    isExported: true,
  });
  genComment(iface, def);

  if (typeProperty) {
    const hash = getHash(lexUri);
    const baseNsid = stripScheme(stripHash(lexUri));

    //= $type?: <uri>
    iface.addProperty({
      name: typeProperty === "required" ? `$type` : `$type?`,
      type:
        // Not using $Type here because it is less readable than a plain string
        // `$Type<${JSON.stringify(baseNsid)}, ${JSON.stringify(hash)}>`
        hash === "main"
          ? JSON.stringify(`${baseNsid}`)
          : JSON.stringify(`${baseNsid}#${hash}`),
    });
  }

  const nullableProps = new Set(def.nullable);
  if (def.properties) {
    for (const propKey in def.properties) {
      const propDef = def.properties[propKey];
      const propNullable = nullableProps.has(propKey);
      const req = def.required?.includes(propKey) ||
        (defaultsArePresent &&
          "default" in propDef &&
          propDef.default !== undefined);
      if (propDef.type === "ref" || propDef.type === "union") {
        //= propName: External|External
        const types = propDef.type === "union"
          ? propDef.refs.map((ref) =>
            refToUnionType(ref, lexUri, imports, options?.mappings)
          )
          : [
            refToType(
              propDef.ref,
              stripScheme(stripHash(lexUri)),
              imports,
              options?.mappings,
            ),
          ];
        if (propDef.type === "union" && !propDef.closed) {
          types.push("{ $type: string }");
        }
        iface.addProperty({
          name: `${propKey}${req ? "" : "?"}`,
          type: makeType(types, { nullable: propNullable }),
        });
        continue;
      } else {
        if (propDef.type === "array") {
          //= propName: type[]
          let propAst;
          if (propDef.items.type === "ref") {
            propAst = iface.addProperty({
              name: `${propKey}${req ? "" : "?"}`,
              type: makeType(
                refToType(
                  propDef.items.ref,
                  stripScheme(stripHash(lexUri)),
                  imports,
                  options?.mappings,
                ),
                {
                  nullable: propNullable,
                  array: true,
                },
              ),
            });
          } else if (propDef.items.type === "union") {
            const types = propDef.items.refs.map((ref) =>
              refToUnionType(ref, lexUri, imports, options?.mappings)
            );
            if (!propDef.items.closed) {
              types.push("{ $type: string }");
            }
            propAst = iface.addProperty({
              name: `${propKey}${req ? "" : "?"}`,
              type: makeType(types, {
                nullable: propNullable,
                array: true,
              }),
            });
          } else {
            propAst = iface.addProperty({
              name: `${propKey}${req ? "" : "?"}`,
              type: makeType(primitiveOrBlobToType(propDef.items), {
                nullable: propNullable,
                array: true,
              }),
            });
          }
          genComment(propAst, propDef);
        } else {
          //= propName: type
          genComment(
            iface.addProperty({
              name: `${propKey}${req ? "" : "?"}`,
              type: makeType(primitiveOrBlobToType(propDef), {
                nullable: propNullable,
              }),
            }),
            propDef,
          );
        }
      }
    }

    if (allowUnknownProperties) {
      //= [k: string]: unknown
      iface.addIndexSignature({
        keyName: "k",
        keyType: "string",
        returnType: "unknown",
      });
    }
  }
}

export function genToken(file: SourceFile, lexUri: string, def: LexToken) {
  //= /** <comment> */
  //= export const <TOKEN> = `${id}#<token>`
  genComment(
    file.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: toScreamingSnakeCase(getHash(lexUri)),
          type: "string",
          initializer: `\`\${id}#${getHash(lexUri)}\``,
        },
      ],
    }),
    def,
  );
}

export function genArray(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexUri: string,
  def: LexArray,
  options?: CodeGenOptions,
) {
  if (def.items.type === "ref") {
    file.addTypeAlias({
      name: toTitleCase(getHash(lexUri)),
      type: `${
        refToType(
          def.items.ref,
          stripScheme(stripHash(lexUri)),
          imports,
          options?.mappings,
        )
      }[]`,
      isExported: true,
    });
  } else if (def.items.type === "union") {
    const types = def.items.refs.map((ref) =>
      refToUnionType(ref, lexUri, imports, options?.mappings)
    );
    if (!def.items.closed) {
      types.push("{ $type: string }");
    }
    file.addTypeAlias({
      name: toTitleCase(getHash(lexUri)),
      type: `(${types.join("|")})[]`,
      isExported: true,
    });
  } else {
    genComment(
      file.addTypeAlias({
        name: toTitleCase(getHash(lexUri)),
        type: `${primitiveOrBlobToType(def.items)}[]`,
        isExported: true,
      }),
      def,
    );
  }
}

export function genPrimitiveOrBlob(
  file: SourceFile,
  lexUri: string,
  def: LexPrimitive | LexBlob | LexIpldType,
) {
  genComment(
    file.addTypeAlias({
      name: toTitleCase(getHash(lexUri)),
      type: primitiveOrBlobToType(def),
      isExported: true,
    }),
    def,
  );
}

export function genXrpcParams(
  file: SourceFile,
  lexicons: Lexicons,
  lexUri: string,
  defaultsArePresent = true,
) {
  const def = lexicons.getDefOrThrow(lexUri, [
    "query",
    "subscription",
    "procedure",
  ]);

  // @NOTE We need to use a `type` here instead of  an `interface` because we
  // need the generated type to be used as generic type parameter like this:
  //
  // type QueryParams = {} // Generated by this function
  //
  // type MyUtil<P extends xrpcServer.QueryParam> = (...)
  // type NsType = MyUtil<NS.QueryParams> // ERROR if `NS.QueryParams` is an `interface`
  //
  // Second line will fail if `NS.QueryParams` is an `interface` that does
  // not explicitly extend `xrpcServer.QueryParam`, or have a string index
  // signature that encompasses `xrpcServer.QueryParam`.

  //= export type QueryParams = {...}
  if (
    def.parameters && def.parameters.properties &&
    Object.keys(def.parameters.properties).length > 0
  ) {
    genComment(
      file.addTypeAlias({
        name: "QueryParams",
        isExported: true,
        type: `{
          ${
          Object.entries(def.parameters.properties)
            .map(([paramKey, paramDef]) => {
              const req = def.parameters!.required?.includes(paramKey) ||
                (defaultsArePresent &&
                  "default" in paramDef &&
                  paramDef.default !== undefined);
              const jsDoc = paramDef.description
                ? `/** ${paramDef.description} */\n`
                : "";
              return `${jsDoc}${paramKey}${req ? "" : "?"}: ${
                paramDef.type === "array"
                  ? primitiveToType(paramDef.items) + "[]"
                  : primitiveToType(paramDef)
              }`;
            })
            .join("\n")
        }
        }`,
      }),
      def.parameters,
    );
  } else {
    file.addTypeAlias({
      name: "QueryParams",
      isExported: true,
      type: "globalThis.Record<PropertyKey, never>",
    });
  }
}

export function genXrpcInput(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexicons: Lexicons,
  lexUri: string,
  defaultsArePresent = true,
  options?: CodeGenOptions,
) {
  const def = lexicons.getDefOrThrow(lexUri, ["query", "procedure"]);

  if (def.type === "procedure" && def.input?.schema) {
    if (def.input.schema.type === "ref" || def.input.schema.type === "union") {
      //= export type InputSchema = ...

      const types = def.input.schema.type === "union"
        ? def.input.schema.refs.map((ref) =>
          refToUnionType(ref, lexUri, imports, options?.mappings)
        )
        : [
          refToType(
            def.input.schema.ref,
            stripScheme(stripHash(lexUri)),
            imports,
            options?.mappings,
          ),
        ];

      if (def.input.schema.type === "union" && !def.input.schema.closed) {
        types.push("{ $type: string }");
      }
      file.addTypeAlias({
        name: "InputSchema",
        type: types.join("|"),
        isExported: true,
      });
    } else {
      //= export interface InputSchema {...}
      genObject(file, imports, lexUri, def.input.schema, `InputSchema`, {
        defaultsArePresent,
      }, options);
    }
  } else if (def.type === "procedure" && def.input?.encoding) {
    //= export type InputSchema = string | Uint8Array | Blob
    file.addTypeAlias({
      isExported: true,
      name: "InputSchema",
      type: "string | Uint8Array | Blob",
    });
  } else {
    //= export type InputSchema = undefined
    file.addTypeAlias({
      isExported: true,
      name: "InputSchema",
      type: "undefined",
    });
  }
}

export function genXrpcOutput(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexicons: Lexicons,
  lexUri: string,
  defaultsArePresent = true,
  options?: CodeGenOptions,
) {
  const def = lexicons.getDefOrThrow(lexUri, [
    "query",
    "subscription",
    "procedure",
  ]);

  const schema = def.type === "subscription"
    ? def.message?.schema
    : def.output?.schema;
  if (schema) {
    if (schema.type === "ref" || schema.type === "union") {
      //= export type OutputSchema = ...
      const types = schema.type === "union"
        ? schema.refs.map((ref) =>
          refToUnionType(ref, lexUri, imports, options?.mappings)
        )
        : [
          refToType(
            schema.ref,
            stripScheme(stripHash(lexUri)),
            imports,
            options?.mappings,
          ),
        ];
      if (schema.type === "union" && !schema.closed) {
        types.push("{ $type: string }");
      }
      file.addTypeAlias({
        name: "OutputSchema",
        type: types.join("|"),
        isExported: true,
      });
    } else {
      // Check if schema is empty (no properties)
      const isEmpty = !schema.properties ||
        Object.keys(schema.properties).length === 0;
      if (isEmpty) {
        //= export type OutputSchema = Record<PropertyKey, never>
        file.addTypeAlias({
          name: "OutputSchema",
          type: "globalThis.Record<PropertyKey, never>",
          isExported: true,
        });
      } else {
        //= export interface OutputSchema {...}
        genObject(file, imports, lexUri, schema, `OutputSchema`, {
          defaultsArePresent,
        }, options);
      }
    }
  }
}

export function genRecord(
  file: SourceFile,
  imports: Map<string, Set<string>>,
  lexicons: Lexicons,
  lexUri: string,
  options?: CodeGenOptions,
) {
  const def = lexicons.getDefOrThrow(lexUri, ["record"]);

  //= export interface Record {...}
  genObject(file, imports, lexUri, def.record, "Record", {
    defaultsArePresent: true,
    allowUnknownProperties: true,
    typeProperty: "required",
  }, options);

  //= export function isRecord(v: unknown): v is Record {...}
  genObjHelpers(file, lexUri, "Record", {
    requireTypeProperty: true,
  });

  const hash = getHash(lexUri);
  if (hash === "main") {
    //= export type Main = Record
    file.addTypeAlias({
      name: "Main",
      type: "Record",
      isExported: true,
    });
  }
}

function genObjHelpers(
  file: SourceFile,
  lexUri: string,
  ifaceName: string,
  {
    requireTypeProperty,
  }: {
    requireTypeProperty: boolean;
  },
) {
  const hash = getHash(lexUri);

  const hashVar = `hash${ifaceName}`;

  file.addVariableStatement({
    isExported: false,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [{ name: hashVar, initializer: JSON.stringify(hash) }],
  });

  const isX = toCamelCase(`is-${ifaceName}`);

  //= export function is{X}<V>(v: V): v is {ifaceName} & V {...}
  file
    .addFunction({
      name: isX,
      typeParameters: [{ name: `V` }],
      parameters: [{ name: `v`, type: `V` }],
      returnType: `v is ${ifaceName} & V`,
      isExported: true,
    })
    .setBodyText(`return is$typed(v, id, ${hashVar})`);

  const validateX = toCamelCase(`validate-${ifaceName}`);

  //= export function validate{X}<V>(v: V): ValidationResult<{ifaceName} & V> {...}
  file
    .addFunction({
      name: validateX,
      typeParameters: [{ name: `V` }],
      parameters: [{ name: `v`, type: `V` }],
      returnType: `ValidationResult<${ifaceName} & V>`,
      isExported: true,
    })
    .setBodyText(
      `return validate<${ifaceName} & V>(v, id, ${hashVar}${
        requireTypeProperty ? ", true" : ""
      })`,
    );
}

export function stripScheme(uri: string): string {
  if (uri.startsWith("lex:")) return uri.slice(4);
  return uri;
}

export function stripHash(uri: string): string {
  return uri.split("#")[0] || "";
}

export function getHash(uri: string): string {
  return uri.split("#").pop() || "";
}

export function ipldToType(def: LexCidLink | LexBytes) {
  if (def.type === "bytes") {
    return "Uint8Array";
  }
  return "CID";
}

function refToUnionType(
  ref: string,
  lexUri: string,
  imports: Map<string, Set<string>>,
  mappings?: ImportMapping[],
): string {
  const baseNsid = stripScheme(stripHash(lexUri));
  return `$Typed<${refToType(ref, baseNsid, imports, mappings)}>`;
}

export function resolveExternalImport(
  nsid: string,
  mappings?: ImportMapping[],
): ImportMapping | undefined {
  if (!mappings) return undefined;
  return mappings.find((mapping) => {
    return mapping.nsid.some((pattern) => {
      if (pattern.endsWith(".*")) {
        return nsid.startsWith(pattern.slice(0, -1));
      }
      return nsid === pattern;
    });
  });
}

function refToType(
  ref: string,
  baseNsid: string,
  imports: Map<string, Set<string>>,
  mappings?: ImportMapping[],
): string {
  let [refBase, refHash] = ref.split("#");
  refBase = stripScheme(refBase);
  if (!refHash) refHash = "main";

  // internal
  if (!refBase || baseNsid === refBase) {
    return toTitleCase(refHash);
  }

  // external - check if there's a mapping
  const mapping = resolveExternalImport(refBase, mappings);
  if (mapping) {
    if (!imports.has(refBase)) {
      imports.set(refBase, new Set());
    }
    const types = imports.get(refBase)!;
    types.add(refHash);

    if (typeof mapping.imports === "string") {
      // String mapping means namespace import
      return `${toTitleCase(refBase)}.${toTitleCase(refHash)}`;
    } else {
      const result = mapping.imports(refBase);
      if (result.type === "namespace") {
        return `${toTitleCase(refBase)}.${toTitleCase(refHash)}`;
      } else {
        // Named import - return just the type name
        return toTitleCase(refHash);
      }
    }
  }

  // external - no mapping, use relative import
  if (!imports.has(refBase)) {
    imports.set(refBase, new Set());
  }
  return `${toTitleCase(refBase)}.${toTitleCase(refHash)}`;
}

export function primitiveOrBlobToType(
  def: LexBlob | LexPrimitive | LexIpldType,
): string {
  switch (def.type) {
    case "blob":
      return "BlobRef";
    case "bytes":
      return "Uint8Array";
    case "cid-link":
      return "CID";
    default:
      return primitiveToType(def);
  }
}

export function primitiveToType(def: LexPrimitive): string {
  switch (def.type) {
    case "string":
      if (def.knownValues?.length) {
        return `${
          def.knownValues
            .map((v) => JSON.stringify(v))
            .join(" | ")
        } | (string & globalThis.Record<PropertyKey, never>)`;
      } else if (def.enum) {
        return def.enum.map((v) => JSON.stringify(v)).join(" | ");
      } else if (def.const) {
        return JSON.stringify(def.const);
      }
      return "string";
    case "integer":
      if (def.enum) {
        return def.enum.map((v) => JSON.stringify(v)).join(" | ");
      } else if (def.const) {
        return JSON.stringify(def.const);
      }
      return "number";
    case "boolean":
      if (def.const) {
        return JSON.stringify(def.const);
      }
      return "boolean";
    case "unknown":
      // @TODO Should we use "object" here ?
      // the "Record" identifier from typescript get overwritten by the Record
      // interface created by lex-cli.
      return "{ [_ in string]: unknown }"; // Record<string, unknown>
    default:
      throw new Error(`Unexpected primitive type: ${JSON.stringify(def)}`);
  }
}

function makeType(
  _types: string | string[],
  opts?: { array?: boolean; nullable?: boolean },
) {
  const types = ([] as string[]).concat(_types);
  if (opts?.nullable) types.push("null");
  const arr = opts?.array ? "[]" : "";
  if (types.length === 1) return `(${types[0]})${arr}`;
  if (arr) return `(${types.join(" | ")})${arr}`;
  return types.join(" | ");
}

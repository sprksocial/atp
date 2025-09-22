import {
  IndentationText,
  Project,
  type SourceFile,
  VariableDeclarationKind,
} from "ts-morph";
import { type LexiconDoc, Lexicons, type LexRecord } from "@atproto/lexicon";
import { NSID } from "@atp/syntax";
import type { GeneratedAPI } from "../types.ts";
import { gen, lexiconsTs, utilTs } from "./common.ts";
import {
  genCommonImports,
  genImports,
  genRecord,
  genUserType,
  genXrpcInput,
  genXrpcOutput,
  genXrpcParams,
} from "./lex-gen.ts";
import {
  type CodeGenOptions,
  type DefTreeNode,
  lexiconsToDefTree,
  schemasToNsidTokens,
  toCamelCase,
  toScreamingSnakeCase,
  toTitleCase,
} from "./util.ts";

const ATP_METHODS = {
  list: "com.atproto.repo.listRecords",
  get: "com.atproto.repo.getRecord",
  create: "com.atproto.repo.createRecord",
  put: "com.atproto.repo.putRecord",
  delete: "com.atproto.repo.deleteRecord",
};

export async function genClientApi(
  lexiconDocs: LexiconDoc[],
  options?: CodeGenOptions,
): Promise<GeneratedAPI> {
  const project = new Project({
    useInMemoryFileSystem: true,
    manipulationSettings: { indentationText: IndentationText.TwoSpaces },
  });
  const api: GeneratedAPI = { files: [] };
  const lexicons = new Lexicons(lexiconDocs);
  const nsidTree = lexiconsToDefTree(lexiconDocs);
  const nsidTokens = schemasToNsidTokens(lexiconDocs);
  for (const lexiconDoc of lexiconDocs) {
    api.files.push(await lexiconTs(project, lexicons, lexiconDoc));
  }
  api.files.push(await utilTs(project));
  api.files.push(await lexiconsTs(project, lexiconDocs, options));
  api.files.push(
    await indexTs(project, lexiconDocs, nsidTree, nsidTokens, options),
  );
  return api;
}

const indexTs = (
  project: Project,
  lexiconDocs: LexiconDoc[],
  nsidTree: DefTreeNode[],
  nsidTokens: Record<string, string[]>,
  options?: CodeGenOptions,
) =>
  gen(project, "/index.ts", (file) => {
    const extension = options?.useJsExtension ? ".js" : ".ts";
    //= import { XrpcClient, type FetchHandler, type FetchHandlerOptions } from '@atp/xrpc'
    const xrpcImport = file.addImportDeclaration({
      moduleSpecifier: "@atp/xrpc",
    });
    xrpcImport.addNamedImports([
      { name: "XrpcClient" },
      { name: "FetchHandler", isTypeOnly: true },
      { name: "FetchHandlerOptions", isTypeOnly: true },
    ]);
    //= import {schemas} from './lexicons.ts'
    file
      .addImportDeclaration({ moduleSpecifier: `./lexicons${extension}` })
      .addNamedImports([{ name: "schemas" }]);

    // Check if any lexicon docs use cid-link types
    const needsCID = lexiconDocs.some((lexiconDoc) =>
      Object.values(lexiconDoc.defs).some((def) =>
        def.type === "cid-link" ||
        (def.type === "object" &&
          Object.values(def.properties || {}).some((prop) =>
            "type" in prop && prop.type === "cid-link"
          )) ||
        (def.type === "array" && def.items.type === "cid-link") ||
        (def.type === "record" &&
          Object.values(def.record.properties || {}).some((prop) =>
            "type" in prop && (prop.type === "cid-link" ||
              (prop.type === "array" && "items" in prop &&
                prop.items.type === "cid-link"))
          ))
      )
    );

    //= import {CID} from 'multiformats/cid'
    if (needsCID) {
      file
        .addImportDeclaration({
          moduleSpecifier: "multiformats/cid",
        })
        .addNamedImports([{ name: "CID" }]);
    }

    //= import { type OmitKey, type Un$Typed } from './util.ts'
    file
      .addImportDeclaration({ moduleSpecifier: `./util${extension}` })
      .addNamedImports([
        { name: "OmitKey", isTypeOnly: true },
        { name: "Un$Typed", isTypeOnly: true },
      ]);

    // generate type imports and re-exports
    for (const lexicon of lexiconDocs) {
      const moduleSpecifier = `./types/${
        lexicon.id.split(".").join("/")
      }${extension}`;
      file
        .addImportDeclaration({ moduleSpecifier })
        .setNamespaceImport(toTitleCase(lexicon.id));
      file
        .addExportDeclaration({ moduleSpecifier })
        .setNamespaceExport(toTitleCase(lexicon.id));
    }

    // generate token enums
    for (const nsidAuthority in nsidTokens) {
      // export const {THE_AUTHORITY} = {
      //  {Name}: "{authority.the.name}"
      // }
      file.addVariableStatement({
        isExported: true,
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
          {
            name: toScreamingSnakeCase(nsidAuthority),
            initializer: [
              "{",
              ...nsidTokens[nsidAuthority].map(
                (nsidName) =>
                  `${toTitleCase(nsidName)}: "${nsidAuthority}.${nsidName}",`,
              ),
              "}",
            ].join("\n"),
          },
        ],
      });
    }

    //= export class AtpBaseClient {...}
    const clientCls = file.addClass({
      name: "AtpBaseClient",
      isExported: true,
      extends: "XrpcClient",
    });

    for (const ns of nsidTree) {
      //= ns: NS
      clientCls.addProperty({
        name: ns.propName,
        type: ns.className,
      });
    }

    //= constructor (options: FetchHandler | FetchHandlerOptions) {
    //=   super(options, schemas)
    //=   {namespace declarations}
    //= }
    clientCls.addConstructor({
      parameters: [
        { name: "options", type: "FetchHandler | FetchHandlerOptions" },
      ],
      statements: [
        "super(options, schemas)",
        ...nsidTree.map(
          (ns) => `this.${ns.propName} = new ${ns.className}(this)`,
        ),
      ],
    });

    //= /** @deprecated use `this` instead */
    //= get xrpc(): XrpcClient {
    //=   return this
    //= }
    clientCls
      .addGetAccessor({
        name: "xrpc",
        returnType: "XrpcClient",
        statements: ["return this"],
      })
      .addJsDoc("@deprecated use `this` instead");

    // generate classes for the schemas
    for (const ns of nsidTree) {
      genNamespaceCls(file, ns);
    }
  });

function genNamespaceCls(file: SourceFile, ns: DefTreeNode) {
  //= export class {ns}NS {...}
  const cls = file.addClass({
    name: ns.className,
    isExported: true,
  });
  //= _client: XrpcClient
  cls.addProperty({
    name: "_client",
    type: "XrpcClient",
  });

  for (const userType of ns.userTypes) {
    if (userType.def.type !== "record") {
      continue;
    }
    //= type: TypeRecord
    const name = NSID.parse(userType.nsid).name || "";
    cls.addProperty({
      name: toCamelCase(name),
      type: `${toTitleCase(userType.nsid)}Record`,
    });
  }

  for (const child of ns.children) {
    //= child: ChildNS
    cls.addProperty({
      name: child.propName,
      type: child.className,
    });

    // recurse
    genNamespaceCls(file, child);
  }

  //= constructor(public client: XrpcClient) {
  //=  this._client = client
  //=  {child namespace prop declarations}
  //=  {record prop declarations}
  //= }
  cls.addConstructor({
    parameters: [
      {
        name: "client",
        type: "XrpcClient",
      },
    ],
    statements: [
      `this._client = client`,
      ...ns.children.map(
        (ns) => `this.${ns.propName} = new ${ns.className}(client)`,
      ),
      ...ns.userTypes
        .filter((ut) => ut.def.type === "record")
        .map((ut) => {
          const name = NSID.parse(ut.nsid).name || "";
          return `this.${toCamelCase(name)} = new ${
            toTitleCase(
              ut.nsid,
            )
          }Record(client)`;
        }),
    ],
  });

  // methods
  for (const userType of ns.userTypes) {
    if (userType.def.type !== "query" && userType.def.type !== "procedure") {
      continue;
    }
    const isGetReq = userType.def.type === "query";
    const moduleName = toTitleCase(userType.nsid);
    const name = toCamelCase(NSID.parse(userType.nsid).name || "");
    const method = cls.addMethod({
      name,
      returnType: `Promise<${moduleName}.Response>`,
    });
    if (isGetReq) {
      method.addParameter({
        name: "params?",
        type: `${moduleName}.QueryParams`,
      });
    } else if (userType.def.type === "procedure") {
      method.addParameter({
        name: "data?",
        type: `${moduleName}.InputSchema`,
      });
    }
    method.addParameter({
      name: "opts?",
      type: `${moduleName}.CallOptions`,
    });
    method.setBodyText(
      [
        `return this._client`,
        isGetReq
          ? `.call('${userType.nsid}', params, undefined, opts)`
          : `.call('${userType.nsid}', opts?.qp, data, opts)`,
        userType.def.errors?.length
          // Only add a catch block if there are custom errors
          ? `  .catch((e) => { throw ${moduleName}.toKnownErr(e) })`
          : "",
      ].join("\n"),
    );
  }

  // record api classes
  for (const userType of ns.userTypes) {
    if (userType.def.type !== "record") {
      continue;
    }
    genRecordCls(file, userType.nsid, userType.def);
  }
}

function genRecordCls(file: SourceFile, nsid: string, lexRecord: LexRecord) {
  //= export class {type}Record {...}
  const cls = file.addClass({
    name: `${toTitleCase(nsid)}Record`,
    isExported: true,
  });
  //= _client: XrpcClient
  cls.addProperty({
    name: "_client",
    type: "XrpcClient",
  });

  //= constructor(client: XrpcClient) {
  //=  this._client = client
  //= }
  const cons = cls.addConstructor();
  cons.addParameter({
    name: "client",
    type: "XrpcClient",
  });
  cons.setBodyText(`this._client = client`);

  // methods
  const typeModule = toTitleCase(nsid);
  {
    //= list()
    const method = cls.addMethod({
      isAsync: true,
      name: "list",
      returnType:
        `Promise<{cursor?: string, records: ({uri: string, value: ${typeModule}.Record})[]}>`,
    });
    method.addParameter({
      name: "params",
      type: `OmitKey<${
        toTitleCase(ATP_METHODS.list)
      }.QueryParams, "collection">`,
    });
    method.setBodyText(
      [
        `const res = await this._client.call('${ATP_METHODS.list}', { collection: '${nsid}', ...params })`,
        `return res.data`,
      ].join("\n"),
    );
  }
  {
    //= get()
    const method = cls.addMethod({
      isAsync: true,
      name: "get",
      returnType:
        `Promise<{uri: string, cid: string, value: ${typeModule}.Record}>`,
    });
    method.addParameter({
      name: "params",
      type: `OmitKey<${
        toTitleCase(ATP_METHODS.get)
      }.QueryParams, "collection">`,
    });
    method.setBodyText(
      [
        `const res = await this._client.call('${ATP_METHODS.get}', { collection: '${nsid}', ...params })`,
        `return res.data`,
      ].join("\n"),
    );
  }
  {
    //= create()
    const method = cls.addMethod({
      isAsync: true,
      name: "create",
      returnType: "Promise<{uri: string, cid: string}>",
    });
    method.addParameter({
      name: "params",
      type: `OmitKey<${
        toTitleCase(
          ATP_METHODS.create,
        )
      }.InputSchema, "collection" | "record">`,
    });
    method.addParameter({
      name: "record",
      type: `Un$Typed<${typeModule}.Record>`,
    });
    method.addParameter({
      name: "headers?",
      type: `Record<string, string>`,
    });
    const maybeRkeyPart = lexRecord.key?.startsWith("literal:")
      ? `rkey: '${lexRecord.key.replace("literal:", "")}', `
      : "";
    method.setBodyText(
      [
        `const collection = '${nsid}'`,
        `const res = await this._client.call('${ATP_METHODS.create}', undefined, { collection, ${maybeRkeyPart}...params, record: { ...record, $type: collection} }, {encoding: 'application/json', headers })`,
        `return res.data`,
      ].join("\n"),
    );
  }
  // {
  //   //= put()
  //   const method = cls.addMethod({
  //     isAsync: true,
  //     name: 'put',
  //     returnType: 'Promise<{uri: string, cid: string}>',
  //   })
  //   method.addParameter({
  //     name: 'params',
  //     type: `OmitKey<${toTitleCase(ATP_METHODS.put)}.InputSchema, "collection" | "record">`,
  //   })
  //   method.addParameter({
  //     name: 'record',
  //     type: `${typeModule}.Record`,
  //   })
  //   method.addParameter({
  //     name: 'headers?',
  //     type: `Record<string, string>`,
  //   })
  //   method.setBodyText(
  //     [
  //       `record.$type = '${userType.nsid}'`,
  //       `const res = await this._client.call('${ATP_METHODS.put}', undefined, { collection: '${userType.nsid}', record, ...params }, {encoding: 'application/json', headers})`,
  //       `return res.data`,
  //     ].join('\n'),
  //   )
  // }
  {
    //= delete()
    const method = cls.addMethod({
      isAsync: true,
      name: "delete",
      returnType: "Promise<void>",
    });
    method.addParameter({
      name: "params",
      type: `OmitKey<${
        toTitleCase(
          ATP_METHODS.delete,
        )
      }.InputSchema, "collection">`,
    });
    method.addParameter({
      name: "headers?",
      type: `Record<string, string>`,
    });

    method.setBodyText(
      [
        `await this._client.call('${ATP_METHODS.delete}', undefined, { collection: '${nsid}', ...params }, { headers })`,
      ].join("\n"),
    );
  }
}

const lexiconTs = (
  project: Project,
  lexicons: Lexicons,
  lexiconDoc: LexiconDoc,
) =>
  gen(
    project,
    `/types/${lexiconDoc.id.split(".").join("/")}.ts`,
    (file) => {
      const main = lexiconDoc.defs.main;
      if (
        main?.type === "query" ||
        main?.type === "subscription" ||
        main?.type === "procedure"
      ) {
        //= import {HeadersMap, XRPCError} from '@atp/xrpc'
        const xrpcImport = file.addImportDeclaration({
          moduleSpecifier: "@atp/xrpc",
        });
        xrpcImport.addNamedImports([
          { name: "HeadersMap" },
          { name: "XRPCError" },
        ]);
      }

      genCommonImports(file, lexiconDoc.id, lexiconDoc);

      const imports: Set<string> = new Set();
      for (const defId in lexiconDoc.defs) {
        const def = lexiconDoc.defs[defId];
        const lexUri = `${lexiconDoc.id}#${defId}`;
        if (defId === "main") {
          if (def.type === "query" || def.type === "procedure") {
            genXrpcParams(file, lexicons, lexUri, false);
            genXrpcInput(file, imports, lexicons, lexUri, false);
            genXrpcOutput(file, imports, lexicons, lexUri);
            genClientXrpcCommon(file, lexicons, lexUri);
          } else if (def.type === "subscription") {
            continue;
          } else if (def.type === "record") {
            genRecord(file, imports, lexicons, lexUri);
          } else {
            genUserType(file, imports, lexicons, lexUri);
          }
        } else {
          genUserType(file, imports, lexicons, lexUri);
        }
      }
      genImports(file, imports, lexiconDoc.id);
      return Promise.resolve();
    },
  );

function genClientXrpcCommon(
  file: SourceFile,
  lexicons: Lexicons,
  lexUri: string,
) {
  const def = lexicons.getDefOrThrow(lexUri, ["query", "procedure"]);

  //= export interface CallOptions {...}
  const opts = file.addInterface({
    name: "CallOptions",
    isExported: true,
  });
  opts.addProperty({ name: "signal?", type: "AbortSignal" });
  opts.addProperty({ name: "headers?", type: "HeadersMap" });
  if (def.type === "procedure") {
    opts.addProperty({ name: "qp?", type: "QueryParams" });
  }
  if (def.type === "procedure" && def.input) {
    let encodingType = "string";
    if (def.input.encoding !== "*/*") {
      encodingType = def.input.encoding
        .split(",")
        .map((v) => `'${v.trim()}'`)
        .join(" | ");
    }
    opts.addProperty({
      name: "encoding?",
      type: encodingType,
    });
  }

  // export interface Response {...}
  const res = file.addInterface({
    name: "Response",
    isExported: true,
  });
  res.addProperty({ name: "success", type: "boolean" });
  res.addProperty({ name: "headers", type: "HeadersMap" });
  if (def.output?.schema) {
    if (def.output.encoding?.includes(",")) {
      res.addProperty({ name: "data", type: "OutputSchema | Uint8Array" });
    } else {
      res.addProperty({ name: "data", type: "OutputSchema" });
    }
  } else if (def.output?.encoding) {
    res.addProperty({ name: "data", type: "Uint8Array" });
  }

  // export class {errcode}Error {...}
  const customErrors: { name: string; cls: string }[] = [];
  for (const error of def.errors || []) {
    let name = toTitleCase(error.name);
    if (!name.endsWith("Error")) name += "Error";
    const errCls = file.addClass({
      name,
      extends: "XRPCError",
      isExported: true,
    });
    errCls.addConstructor({
      parameters: [{ name: "src", type: "XRPCError" }],
      statements: [
        "super(src.status, src.error, src.message, src.headers, { cause: src })",
      ],
    });

    customErrors.push({ name: error.name, cls: name });
  }

  // export function toKnownErr(err: any) {...}
  file.addFunction({
    name: "toKnownErr",
    isExported: true,
    parameters: [{ name: "e", type: "any" }],
    statements: customErrors.length
      ? [
        "if (e instanceof XRPCError) {",
        ...customErrors.map(
          (err) => `if (e.error === '${err.name}') return new ${err.cls}(e)`,
        ),
        "}",
        "return e",
      ]
      : ["return e"],
  });
}

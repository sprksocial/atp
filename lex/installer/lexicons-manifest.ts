import * as l from "../external.ts";

export const lexiconsManifestSchema: l.ObjectSchema<{
  version: l.LiteralSchema<1>;
  lexicons: l.ArraySchema<l.StringSchema<{ format: "nsid" }>>;
  resolutions: l.DictSchema<
    l.StringSchema<{ format: "nsid" }>,
    l.ObjectSchema<{
      uri: l.StringSchema<{ format: "at-uri" }>;
      cid: l.StringSchema<{ format: "cid" }>;
    }>
  >;
}> = l.object({
  version: l.literal(1),
  lexicons: l.array(l.string({ format: "nsid" })),
  resolutions: l.dict(
    l.string({ format: "nsid" }),
    l.object({
      uri: l.string({ format: "at-uri" }),
      cid: l.string({ format: "cid" }),
    }),
  ),
});

export interface LexiconsManifestResolution {
  uri: string;
  cid: string;
}

export interface LexiconsManifest {
  version: 1;
  lexicons: string[];
  resolutions: Record<string, LexiconsManifestResolution>;
}

export function normalizeLexiconsManifest(
  manifest: LexiconsManifest,
): LexiconsManifest {
  return lexiconsManifestSchema.parse({
    version: manifest.version,
    lexicons: [...manifest.lexicons].sort(),
    resolutions: Object.fromEntries(
      Object.entries(manifest.resolutions)
        .sort(compareObjectEntries)
        .map(([key, value]) => [key, { uri: value.uri, cid: value.cid }]),
    ),
  }) as LexiconsManifest;
}

function compareObjectEntries(
  a: [string, unknown],
  b: [string, unknown],
): number {
  if (a[0] > b[0]) return 1;
  if (a[0] < b[0]) return -1;
  return 0;
}

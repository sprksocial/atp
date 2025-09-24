import { CID } from "multiformats/cid";
import { z } from "zod";
import { check, ipldToJson, schema } from "@atp/common";

export const typedJsonBlobRef: TypedJsonBlobRefType = z.strictObject({
  $type: z.literal("blob"),
  ref: schema.cid,
  mimeType: z.string(),
  size: z.number(),
});
type TypedJsonBlobRefType = z.ZodObject<{
  $type: z.ZodLiteral<"blob">;
  ref: typeof schema.cid;
  mimeType: z.ZodString;
  size: z.ZodNumber;
}>;
export type TypedJsonBlobRef = z.infer<TypedJsonBlobRefType>;

export const untypedJsonBlobRef: UntypedJsonBlobRefType = z.strictObject({
  cid: z.string(),
  mimeType: z.string(),
});
type UntypedJsonBlobRefType = z.ZodObject<{
  cid: z.ZodString;
  mimeType: z.ZodString;
}>;
export type UntypedJsonBlobRef = z.infer<UntypedJsonBlobRefType>;

export const jsonBlobRef: JsonBlobRefType = z.union([
  typedJsonBlobRef,
  untypedJsonBlobRef,
]);
type JsonBlobRefType = z.ZodUnion<
  [TypedJsonBlobRefType, UntypedJsonBlobRefType]
>;
export type JsonBlobRef = z.infer<JsonBlobRefType>;

export class BlobRef {
  public original: JsonBlobRef;

  constructor(
    public ref: CID,
    public mimeType: string,
    public size: number,
    original?: JsonBlobRef,
  ) {
    this.original = original ?? {
      $type: "blob",
      ref,
      mimeType,
      size,
    };
  }

  static asBlobRef(obj: unknown): BlobRef | null {
    if (check.is(obj, jsonBlobRef)) {
      return BlobRef.fromJsonRef(obj);
    }
    return null;
  }

  static fromJsonRef(json: JsonBlobRef): BlobRef {
    if (check.is(json, typedJsonBlobRef)) {
      return new BlobRef(json.ref as CID, json.mimeType, json.size, json);
    } else {
      return new BlobRef(CID.parse(json.cid), json.mimeType, -1);
    }
  }

  ipld(): TypedJsonBlobRef {
    return {
      $type: "blob",
      ref: this.ref,
      mimeType: this.mimeType,
      size: this.size,
    };
  }

  toJSON(): {
    $type: "blob";
    ref: { $link: string };
    mimeType: string;
    size: number;
  } {
    return ipldToJson(this.ipld()) as {
      $type: "blob";
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
  }
}

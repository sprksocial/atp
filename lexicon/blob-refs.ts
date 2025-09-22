import { CID } from "multiformats/cid";
import { z } from "zod";
import { check, ipldToJson, schema } from "@atp/common";

export const typedJsonBlobRef = z.strictObject({
  $type: z.literal("blob"),
  ref: schema.cid,
  mimeType: z.string(),
  size: z.number(),
});
export type TypedJsonBlobRef = z.infer<typeof typedJsonBlobRef>;

export const untypedJsonBlobRef = z.strictObject({
  cid: z.string(),
  mimeType: z.string(),
});
export type UntypedJsonBlobRef = z.infer<typeof untypedJsonBlobRef>;

export const jsonBlobRef = z.union([typedJsonBlobRef, untypedJsonBlobRef]);
export type JsonBlobRef = z.infer<typeof jsonBlobRef>;

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

  toJSON() {
    return ipldToJson(this.ipld()) as {
      $type: "blob";
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
  }
}

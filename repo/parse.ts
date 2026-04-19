import type { Cid } from "@atp/lex/data";
import { decode as decodeLexCbor } from "@atp/lex/cbor";
import type { check } from "@atp/common";
import type { BlockMap } from "./block-map.ts";
import { MissingBlockError, UnexpectedObjectError } from "./error.ts";
import type { RepoRecord } from "./types.ts";
import { cborToLexRecord } from "./util.ts";

export const getAndParseRecord = (
  blocks: BlockMap,
  cid: Cid,
): { record: RepoRecord; bytes: Uint8Array } => {
  const bytes = blocks.get(cid);
  if (!bytes) {
    throw new MissingBlockError(cid, "record");
  }
  const record = cborToLexRecord(bytes);
  return { record, bytes };
};

export const getAndParseByDef = <T>(
  blocks: BlockMap,
  cid: Cid,
  def: check.Def<T>,
): { obj: T; bytes: Uint8Array } => {
  const bytes = blocks.get(cid);
  if (!bytes) {
    throw new MissingBlockError(cid, def.name);
  }
  return parseObjByDef(bytes, cid, def);
};

export const parseObjByDef = <T>(
  bytes: Uint8Array,
  cid: Cid,
  def: check.Def<T>,
): { obj: T; bytes: Uint8Array } => {
  const obj = decodeLexCbor(bytes);
  const res = def.schema.safeParse(obj);
  if (res.success) {
    return { obj: res.data, bytes };
  } else {
    throw new UnexpectedObjectError(cid, def.name);
  }
};

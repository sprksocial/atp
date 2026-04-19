import { s32decode, s32encode } from "./util.ts";

const TID_LEN = 13;

let lastTimestamp = 0;
let timestampCount = 0;
let clockid: number | null = null;

function dedash(str: string): string {
  return str.replaceAll("-", "");
}

export class TID {
  str: string;

  constructor(str: string) {
    const noDashes = dedash(str);
    if (noDashes.length !== TID_LEN) {
      throw new Error(`Poorly formatted TID: ${noDashes.length} length`);
    }
    this.str = noDashes;
  }

  static next(prev?: TID): TID {
    const time = Math.max(Date.now(), lastTimestamp);
    if (time === lastTimestamp) {
      timestampCount++;
    }
    lastTimestamp = time;
    const timestamp = time * 1000 + timestampCount;
    if (clockid === null) {
      clockid = Math.floor(Math.random() * 32);
    }
    const tid = TID.fromTime(timestamp, clockid);
    if (!prev || tid.newerThan(prev)) {
      return tid;
    }
    return TID.fromTime(prev.timestamp() + 1, clockid);
  }

  static nextStr(prev?: string): string {
    return TID.next(prev ? new TID(prev) : undefined).toString();
  }

  static fromTime(timestamp: number, clockid: number): TID {
    const str = `${s32encode(timestamp)}${s32encode(clockid).padStart(2, "2")}`;
    return new TID(str);
  }

  static fromStr(str: string): TID {
    return new TID(str);
  }

  static oldestFirst(a: TID, b: TID): number {
    return a.compareTo(b);
  }

  static newestFirst(a: TID, b: TID): number {
    return b.compareTo(a);
  }

  static is(str: string): boolean {
    return dedash(str).length === TID_LEN;
  }

  timestamp(): number {
    return s32decode(this.str.slice(0, 11));
  }

  clockid(): number {
    return s32decode(this.str.slice(11, 13));
  }

  formatted(): string {
    const str = this.toString();
    return `${str.slice(0, 4)}-${str.slice(4, 7)}-${
      str.slice(
        7,
        11,
      )
    }-${str.slice(11, 13)}`;
  }

  toString(): string {
    return this.str;
  }

  compareTo(other: TID): number {
    if (this.str > other.str) return 1;
    if (this.str < other.str) return -1;
    return 0;
  }

  equals(other: TID): boolean {
    return this.str === other.str;
  }

  newerThan(other: TID): boolean {
    return this.compareTo(other) > 0;
  }

  olderThan(other: TID): boolean {
    return this.compareTo(other) < 0;
  }
}

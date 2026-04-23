import { parseCidSafe } from "@atp/lex";
import { parseCidSafe as parseCidSafeFromData } from "@atp/lex/data";
import { assertEquals } from "@std/assert";

const VALID_CID = "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a";

Deno.test("safe CID parsers return parsed CID for valid input", () => {
  assertEquals(parseCidSafe(VALID_CID)?.toString(), VALID_CID);
  assertEquals(parseCidSafeFromData(VALID_CID)?.toString(), VALID_CID);
});

Deno.test("safe CID parsers return null for invalid input", () => {
  assertEquals(parseCidSafe("not-a-cid"), null);
  assertEquals(parseCidSafeFromData("not-a-cid"), null);
});

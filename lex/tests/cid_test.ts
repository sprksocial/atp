import { parseCidSafe as parseCidSafeFromData } from "@atp/lex/data";
import { assertEquals } from "@std/assert";

const VALID_CID = "bafyreidfayvfuwqa7qlnopdjiqrxzs6blmoeu4rujcjtnci5beludirz2a";

Deno.test("parseCidSafe returns parsed CID for valid input", () => {
  assertEquals(parseCidSafeFromData(VALID_CID)?.toString(), VALID_CID);
});

Deno.test("parseCidSafe returns null for invalid input", () => {
  assertEquals(parseCidSafeFromData("not-a-cid"), null);
});

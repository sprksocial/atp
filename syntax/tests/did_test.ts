import { assertThrows } from "@std/assert";
import {
  ensureValidDid,
  ensureValidDidRegex,
  InvalidDidError,
} from "../mod.ts";

Deno.test("validation enforces spec details", () => {
  const expectValid = (h: string) => {
    ensureValidDid(h);
    ensureValidDidRegex(h);
  };
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidDid(h), InvalidDidError);
    assertThrows(() => ensureValidDidRegex(h), InvalidDidError);
  };

  expectValid("did:method:val");
  expectValid("did:method:VAL");
  expectValid("did:method:val123");
  expectValid("did:method:123");
  expectValid("did:method:val-two");
  expectValid("did:method:val_two");
  expectValid("did:method:val.two");
  expectValid("did:method:val:two");
  expectValid("did:method:val%BB");

  expectInvalid("did");
  expectInvalid("didmethodval");
  expectInvalid("method:did:val");
  expectInvalid("did:method:");
  expectInvalid("didmethod:val");
  expectInvalid("did:methodval");
  expectInvalid(":did:method:val");
  expectInvalid("did.method.val");
  expectInvalid("did:method:val:");
  expectInvalid("did:method:val%");
  expectInvalid("DID:method:val");
  expectInvalid("did:METHOD:val");
  expectInvalid("did:m123:val");

  expectValid("did:method:" + "v".repeat(240));
  expectInvalid("did:method:" + "v".repeat(8500));

  expectValid("did:m:v");
  expectValid("did:method::::val");
  expectValid("did:method:-");
  expectValid("did:method:-:_:.:%ab");
  expectValid("did:method:.");
  expectValid("did:method:_");
  expectValid("did:method::.");

  expectInvalid("did:method:val/two");
  expectInvalid("did:method:val?two");
  expectInvalid("did:method:val#two");
  expectInvalid("did:method:val%");

  expectValid(
    "did:onion:2gzyxa5ihm7nsggfxnu52rck2vv4rvmdlkiu3zzui5du4xyclen53wid",
  );
});

Deno.test("validation allows some real DID values", () => {
  const expectValid = (h: string) => {
    ensureValidDid(h);
    ensureValidDidRegex(h);
  };

  expectValid("did:example:123456789abcdefghi");
  expectValid("did:plc:7iza6de2dwap2sbkpav7c6c6");
  expectValid("did:web:example.com");
  expectValid("did:web:localhost%3A1234");
  expectValid("did:key:zQ3shZc2QzApp2oymGvQbzP8eKheVshBHbU4ZYjeXqwSKEn6N");
  expectValid("did:ethr:0xb9c5714089478a327f09197987f16f9e5d936e8a");
});

Deno.test("validation conforms to interop valid DIDs", async () => {
  const expectValid = (h: string) => {
    ensureValidDid(h);
    ensureValidDidRegex(h);
  };

  const filePath =
    new URL("./interop/did_syntax_valid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectValid(line);
  }
});

Deno.test("validation conforms to interop invalid DIDs", async () => {
  const expectInvalid = (h: string) => {
    assertThrows(() => ensureValidDid(h), InvalidDidError);
    assertThrows(() => ensureValidDidRegex(h), InvalidDidError);
  };

  const filePath =
    new URL("./interop/did_syntax_invalid.txt", import.meta.url).pathname;
  const fileContent = await Deno.readTextFile(filePath);
  const lines = fileContent.split("\n");

  for (const line of lines) {
    if (line.startsWith("#") || line.length === 0) {
      continue;
    }
    expectInvalid(line);
  }
});

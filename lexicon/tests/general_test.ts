import { assertThrows } from "@std/assert";
import { Lexicons } from "../mod.ts";
import LexiconDocs from "./scaffolds/lexicons.ts";
import { assertEquals } from "@std/assert/equals";

const lex = new Lexicons(LexiconDocs);

Deno.test("Adds schemas", () => {
  assertThrows(() => lex.add(LexiconDocs[0]));
});

Deno.test("Correctly references all definitions", () => {
  assertEquals(lex.getDef("com.example.kitchenSink"), LexiconDocs[0].defs.main);
  assertEquals(
    lex.getDef("lex:com.example.kitchenSink"),
    LexiconDocs[0].defs.main,
  );
  assertEquals(
    lex.getDef("com.example.kitchenSink#main"),
    LexiconDocs[0].defs.main,
  );
  assertEquals(
    lex.getDef("lex:com.example.kitchenSink#main"),
    LexiconDocs[0].defs.main,
  );
  assertEquals(
    lex.getDef("com.example.kitchenSink#object"),
    LexiconDocs[0].defs.object,
  );
  assertEquals(
    lex.getDef("lex:com.example.kitchenSink#object"),
    LexiconDocs[0].defs.object,
  );
});

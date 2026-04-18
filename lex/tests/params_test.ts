import { l } from "@atp/lex";
import { assertEquals } from "@std/assert";

Deno.test("parses wrapped string params from URLSearchParams", () => {
  const params = l.params({
    q: l.optional(l.string()),
    tags: l.optional(l.array(l.string())),
    mode: l.optional(l.enum(["true", "false"])),
  });

  assertEquals(
    params.fromURLSearchParams(
      new URLSearchParams("q=true&tags=123&tags=false&mode=true"),
    ),
    {
      q: "true",
      tags: ["123", "false"],
      mode: "true",
    },
  );
});

Deno.test("serializes transformed params to URLSearchParams", () => {
  const params = l.params({
    since: l.optional(l.string({ format: "datetime" })),
  });

  assertEquals(
    params.toURLSearchParams(
      {
        since: new Date("2024-01-02T03:04:05.000Z"),
      } as unknown as never,
    ).toString(),
    "since=2024-01-02T03%3A04%3A05.000Z",
  );
});

Deno.test("preserves undeclared params from URLSearchParams", () => {
  const params = l.params({
    name: l.string(),
  });

  const result = params.fromURLSearchParams(
    new URLSearchParams("name=Alice&num=1&num=2&foo=3"),
  ) as Record<string, unknown>;

  assertEquals(
    result,
    {
      name: "Alice",
      num: ["1", "2"],
      foo: "3",
    },
  );
});

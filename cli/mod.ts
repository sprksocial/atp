/**
 * # ATP CLI
 *
 * A general command-line interface for ATP development tools.
 *
 * ## Installation
 * ```bash
 * deno install -g jsr:@atp/cli --name atp
 * ```
 * Alternatively, you can use it without installation by referring to
 * it as `jsr:@atp/cli` instead of `atp`.
 *
 * @example Fetch Record from AT URI
 * ```bash
 * atp at://bsky.app/app.bsky.feed.post/3jrq7y2h2ts2b
 * ```
 *
 * @module
 */
import { Command } from "@cliffy/command";
import { handleGetCommand } from "./get.ts";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

const args = isDeno ? Deno.args : process.argv.slice(2);

await new Command()
  .name("atp")
  .description(
    "ATP Development CLI.",
  )
  .arguments("<uri>")
  .action(async (_options, input: string) => {
    if (
      input.startsWith("did:") || input.includes(".") ||
      input.startsWith("at://")
    ) {
      await handleGetCommand(input);
    } else {
      console.error(`Invalid input format: ${input}`);
      console.error("Expected: did:, handle.domain, or at://...");
      if (isDeno) Deno.exit(1);
      else process.exit(1);
    }
  })
  .parse(args);

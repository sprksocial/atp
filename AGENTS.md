# Agent Guidelines for ATP Monorepo

## Build & Test Commands

- Run all tests: `deno test -P`
- Run single test file: `deno test -P path/to/file_test.ts`
- Run specific test: `deno test -P --filter "test name" path/to/file_test.ts`
- Format code: `deno fmt`
- Lint code: `deno lint`
- Check code: `deno check`

## Code Style

- **NO COMMENTS** unless explicitly requested
- Use JSDoc only for exported types/functions with `@prop`, `@param`, `@returns`
  tags
- Test files: `*_test.ts` pattern (e.g., `car_test.ts`), use Deno.test(),
  imports from `@std/assert`
- Types: Explicit types for function parameters/returns, prefer `interface` over
  `type` for objects
- Error handling: Use custom error classes extending base errors, include
  `ErrorOptions` with `cause`
- Imports: Use JSR/npm imports from deno.json, absolute imports (e.g.,
  `@atp/crypto`, `@std/assert`)
- Naming: camelCase for vars/functions, PascalCase for classes/types, UPPER_CASE
  for constants
- Exports: Use `export` directly, re-export from `mod.ts` for public API
- Async: Prefer async/await over promises, use AsyncGenerator for streams
- Formatting: 2 spaces indent, semicolons, trailing commas, 80 char soft limit

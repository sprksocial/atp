# ATP

[![JSR @atp](https://jsr.io/badges/@atp)](https://jsr.io/@atp)

A suite of TypeScript libraries for the AT Protocol, built on web standards.

## Overview

This monorepo provides modular, standards-based TypeScript implementations of
core AT Protocol components, based on the @atproto NPM packages.

Each package is designed to work across JavaScript runtimes (Deno, Node.js, Bun,
Cloudflare Workers) and can be used independently or together.

## Packages

### [@atp/xrpc-server](./xrpc-server)

Hono-based XRPC server implementation with lexicon validation, authentication,
rate limiting, and WebSocket streaming support. Works across JavaScript runtimes
with comprehensive error handling and type safety.

### [@atp/xrpc](./xrpc)

XRPC client library for calling AT Protocol services with lexicon schema
validation.

### [@atp/sync](./sync)

Tools for syncing data from AT Protocol, including firehose (relay)
subscriptions with authentication and filtering.

### [@atp/lex-cli](./lex-cli)

Command-line tool for generating documentation, servers, and clients from AT
Protocol lexicon files.

### [@atp/crypto](./crypto)

Cryptographic primitives for AT Protocol supporting P-256 and K-256 (secp256k1)
elliptic curves. Includes key generation, signing, verification, DID key
serialization, and hashing utilities.

### [@atp/identity](./identity)

Decentralized identity resolution for DIDs and handles. Resolves handles to
DIDs, DIDs to DID documents, and provides caching and verification methods.

### [@atp/lexicon](./lexicon)

Validation utilities for AT Protocol lexicons. Validates records, XRPC
parameters, inputs, and outputs against lexicon schemas.

### [@atp/repo](./repo)

Repository utilities including the Merkle Search Tree (MST) implementation.
Handles signed key/value stores with CBOR-encoded data records, CAR files, and
repo synchronization.

### [@atp/syntax](./syntax)

Validation and parsing for AT Protocol string formats including DIDs, handles,
NSIDs, AT URIs, TIDs, record keys, and datetimes.

### [@atp/common](./common)

Shared utilities for server-oriented applications, including IPLD handling,
streams, async helpers, obfuscation, retry logic, and TID generation.

### [@atp/bytes](./bytes)

Simple `Uint8Array` utilities including allocation, comparison, concatenation,
string conversion (with multibase encoding support), and XOR operations. Based
on the uint8arrays npm package.

## Installation

Each package can be installed independently from JSR:

```bash
# deno
deno add jsr:@atp/crypto jsr:@atp/xrpc-server

# pnpm 10.9+
pnpm add jsr:@atp/crypto jsr:@atp/identity jsr:@atp/xrpc

# yarn 4.9+
yarn add jsr:@atp/crypto jsr:@atp/identity jsr:@atp/xrpc

# npm, bun, and older versions of yarn or pnpm
npx jsr add @atp/xrpc-server # replace npx with any of yarn dlx, pnpm dlx, or bunx
```

## Development

Ensure you have the latest version of [Deno](https://deno.com/) installed.

```bash
deno test
```

## License

MIT

import type { DidKeyPlugin } from "@atp/crypto";
import { p256Plugin } from "./p256/plugin.ts";
import { secp256k1Plugin } from "./secp256k1/plugin.ts";

/**
 * Plugins for different elliptic curves.
 *
 * Currently supports P-256 and secp256k1.
 */
export const plugins: DidKeyPlugin[] = [p256Plugin, secp256k1Plugin];

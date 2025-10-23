import * as ui8 from "@atp/bytes";
import * as common from "@atp/common";
import { MINUTE } from "@atp/common";
import * as crypto from "@atp/crypto";
import { AuthRequiredError } from "./errors.ts";

/**
 * Parameters for service JWT creation
 * @prop iss The issuer of the key (corresponds to user DID)
 * @prop aud The intended audience of the key, the service it's intended for
 * @prop iat When the key was issued at
 * @prop exp When the key expires
 * @prop lxm Lexicon (XRPC) endpoints the key is allowed to be used for
 * @prop keypair Signing key to be used to create the JWT token
 */
export type ServiceJwtParams = {
  iss: string;
  aud: string;
  iat?: number;
  exp?: number;
  lxm: string | null;
  keypair: crypto.Keypair;
};

/**
 * Headers of a service JWT token
 * @prop alg Algorithm used for the JWT token's encoding
 */
export type ServiceJwtHeaders = {
  alg: string;
} & Record<string, unknown>;

/**
 * Parameters for service JWT creation
 * @prop iss The issuer of the token (corresponds to user DID)
 * @prop aud The intended audience of the token, the service it's intended for
 * @prop exp When the key expires
 * @prop lxm Lexicon (XRPC) endpoints the token is allowed to be used for
 * @prop jti JWT Identifier
 */
export type ServiceJwtPayload = {
  iss: string;
  aud: string;
  exp: number;
  lxm?: string;
  jti?: string;
};

/**
 * Create a JWT token string for service auth
 * @param params Information and permissions given to the service JWT token
 */
export const createServiceJwt = (
  params: ServiceJwtParams,
): string => {
  const { iss, aud, keypair } = params;
  const iat = params.iat ?? Math.floor(Date.now() / 1e3);
  const exp = params.exp ?? iat + MINUTE / 1e3;
  const lxm = params.lxm ?? undefined;
  const jti = crypto.randomStr(16, "hex");
  const header = {
    typ: "JWT",
    alg: keypair.jwtAlg,
  };
  const payload = common.noUndefinedVals({
    iat,
    iss,
    aud,
    exp,
    lxm,
    jti,
  });
  const toSignStr = `${jsonToB64Url(header)}.${jsonToB64Url(payload)}`;
  const toSign = ui8.fromString(toSignStr, "utf8");
  const sig = keypair.sign(toSign);
  return `${toSignStr}.${ui8.toString(sig, "base64url")}`;
};

/**
 * Creates authorization headers containing a service JWT.
 * Useful for making authenticated HTTP requests to other services.
 *
 * @param params - Parameters for creating the JWT
 * @returns Object containing authorization header with Bearer token
 *
 * @example
 * ```typescript
 * const auth = await createServiceAuthHeaders({
 *   iss: 'did:example:issuer',
 *   aud: 'did:example:audience',
 *   keypair: myKeypair
 * });
 * fetch(url, { headers: auth.headers });
 * ```
 */
export const createServiceAuthHeaders = (
  params: ServiceJwtParams,
): { headers: { authorization: string } } => {
  const jwt = createServiceJwt(params);
  return {
    headers: { authorization: `Bearer ${jwt}` },
  };
};

const jsonToB64Url = (json: Record<string, unknown>): string => {
  return common.utf8ToB64Url(JSON.stringify(json));
};

/** Verify a message signature against a key */
export type VerifySignatureWithKeyFn = (
  key: string,
  msgBytes: Uint8Array,
  sigBytes: Uint8Array,
  alg: string,
) => boolean;

/**
 * Verify a JWT token is valid against the context in which
 * it's being used, including the lxm matching the current endpoint,
 * the aud matching the service DID, and the key itself matching
 * the signing key of the DID who claims to have issued it
 * @param jwtStr The JWT token being used
 * @param ownDid The DID of the current service, null indicates to skip the audience check
 * @param lxm The lexicon permissions of the JWT token, null indicates to skip the lxm check
 * @param getSigningKey A function to get the signing key of the issuer
 * @param verifySignatureWithKey A method to verify the signature with the JWT token,
 */
export const verifyJwt = async (
  jwtStr: string,
  ownDid: string | null,
  lxm: string | null,
  getSigningKey: (
    iss: string,
    forceRefresh: boolean,
  ) => Promise<string> | string,
  verifySignatureWithKey: VerifySignatureWithKeyFn =
    cryptoVerifySignatureWithKey,
): Promise<ServiceJwtPayload> => {
  const parts = jwtStr.split(".");
  if (parts.length !== 3) {
    throw new AuthRequiredError("poorly formatted jwt", "BadJwt");
  }

  const header = parseHeader(parts[0]);

  // The spec does not describe what to do with the "typ" claim. We can,
  // however, forbid some values that are not compatible with our use case.
  if (
    // service tokens are not OAuth 2.0 access tokens
    // https://datatracker.ietf.org/doc/html/rfc9068
    header["typ"] === "at+jwt" ||
    // "refresh+jwt" is a non-standard type used by atproto packages
    header["typ"] === "refresh+jwt" ||
    // "DPoP" proofs are not meant to be used as service tokens
    // https://datatracker.ietf.org/doc/html/rfc9449
    header["typ"] === "dpop+jwt"
  ) {
    throw new AuthRequiredError(
      `Invalid jwt type "${header["typ"]}"`,
      "BadJwtType",
    );
  }

  const payload = parsePayload(parts[1]);
  const sig = parts[2];

  if (Date.now() / 1000 > payload.exp) {
    throw new AuthRequiredError("jwt expired", "JwtExpired");
  }
  if (ownDid !== null && payload.aud !== ownDid) {
    throw new AuthRequiredError(
      "jwt audience does not match service did",
      "BadJwtAudience",
    );
  }
  if (lxm !== null && payload.lxm !== lxm) {
    throw new AuthRequiredError(
      payload.lxm !== undefined
        ? `bad jwt lexicon method ("lxm"). must match: ${lxm}`
        : `missing jwt lexicon method ("lxm"). must match: ${lxm}`,
      "BadJwtLexiconMethod",
    );
  }

  const msgBytes = ui8.fromString(parts.slice(0, 2).join("."), "utf8");
  const sigBytes = ui8.fromString(sig, "base64url");

  const signingKey = await getSigningKey(payload.iss, false);
  const { alg } = header;

  let validSig: boolean;
  try {
    validSig = verifySignatureWithKey(
      signingKey,
      msgBytes,
      sigBytes,
      alg,
    );
  } catch {
    throw new AuthRequiredError(
      "could not verify jwt signature",
      "BadJwtSignature",
    );
  }

  if (!validSig) {
    // get fresh signing key in case it failed due to a recent rotation
    const freshSigningKey = await getSigningKey(payload.iss, true);
    try {
      validSig = freshSigningKey !== signingKey
        ? verifySignatureWithKey(
          freshSigningKey,
          msgBytes,
          sigBytes,
          alg,
        )
        : false;
    } catch {
      throw new AuthRequiredError(
        "could not verify jwt signature",
        "BadJwtSignature",
      );
    }
  }

  if (!validSig) {
    throw new AuthRequiredError(
      "jwt signature does not match jwt issuer",
      "BadJwtSignature",
    );
  }

  return payload;
};

/**
 * Default method to verify a JWT signature against a key.
 * @param key to verify JWT token against
 * @param msgBytes Corresponding message
 * @param sigBytes JWT signature bytes to verify
 * @param alg Encoding algorithm for JWT signature
 */
export const cryptoVerifySignatureWithKey: VerifySignatureWithKeyFn = (
  key: string,
  msgBytes: Uint8Array,
  sigBytes: Uint8Array,
  alg: string,
) => {
  return crypto.verifySignature(key, msgBytes, sigBytes, {
    jwtAlg: alg,
    allowMalleableSig: true,
  });
};

const parseB64UrlToJson = (b64: string) => {
  return JSON.parse(common.b64UrlToUtf8(b64));
};

const parseHeader = (b64: string): ServiceJwtHeaders => {
  const header = parseB64UrlToJson(b64);
  if (!header || typeof header !== "object" || typeof header.alg !== "string") {
    throw new AuthRequiredError("poorly formatted jwt", "BadJwt");
  }
  return header;
};

const parsePayload = (b64: string): ServiceJwtPayload => {
  const payload = parseB64UrlToJson(b64);
  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.iss !== "string" ||
    typeof payload.aud !== "string" ||
    typeof payload.exp !== "number" ||
    (payload.lxm && typeof payload.lxm !== "string") ||
    (payload.nonce && typeof payload.nonce !== "string")
  ) {
    throw new AuthRequiredError("poorly formatted jwt", "BadJwt");
  }
  return payload;
};

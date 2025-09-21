import { decodeBase64 } from "@std/encoding";

export function obfuscateEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${obfuscateWord(local)}@${obfuscateWord(domain)}`;
}

export function obfuscateWord(word: string): string {
  return `${word.charAt(0)}***${word.charAt(word.length - 1)}`;
}

export function obfuscateHeaders(
  headers: Record<string, string>,
): Record<string, string> {
  const obfuscatedHeaders: Record<string, string> = {};
  for (const key in headers) {
    if (key.toLowerCase() === "authorization") {
      obfuscatedHeaders[key] = obfuscateAuthHeader(headers[key]);
    } else if (key.toLowerCase() === "dpop") {
      obfuscatedHeaders[key] = obfuscateJwt(headers[key]) || "Invalid";
    } else {
      obfuscatedHeaders[key] = headers[key];
    }
  }
  return obfuscatedHeaders;
}

export function obfuscateAuthHeader(authHeader: string): string {
  // This is a hot path (runs on every request). Avoid using split() or regex.

  const spaceIdx = authHeader.indexOf(" ");
  if (spaceIdx === -1) return "Invalid";

  const type = authHeader.slice(0, spaceIdx);
  switch (type.toLowerCase()) {
    case "bearer":
    case "dpop":
      return `${type} ${obfuscateBearer(authHeader.slice(spaceIdx + 1))}`;
    case "basic":
      return `${type} ${
        obfuscateBasic(authHeader.slice(spaceIdx + 1)) || "Invalid"
      }`;
    default:
      return `Invalid`;
  }
}

export function obfuscateBasic(token: string): null | string {
  if (!token) return null;
  const buffer = decodeBase64(token);
  if (!buffer.length) return null;
  const authHeader = new TextDecoder("utf-8").decode(buffer);
  const colIdx = authHeader.indexOf(":");
  if (colIdx === -1) return null;
  const username = authHeader.slice(0, colIdx);
  return `${username}:***`;
}

export function obfuscateBearer(token: string): string {
  return obfuscateJwt(token) || obfuscateToken(token);
}

export function obfuscateToken(token: string): string {
  if (token.length >= 12) return obfuscateWord(token);
  return token ? "***" : "";
}

export function obfuscateJwt(token: string): null | string {
  const firstDot = token.indexOf(".");
  if (firstDot === -1) return null;

  const secondDot = token.indexOf(".", firstDot + 1);
  if (secondDot === -1) return null;

  // Expected to be missing
  const thirdDot = token.indexOf(".", secondDot + 1);
  if (thirdDot !== -1) return null;

  try {
    const payloadEnc = token.slice(firstDot + 1, secondDot);
    const payloadJson = new TextDecoder("utf-8").decode(
      decodeBase64(payloadEnc),
    );
    const payload = JSON.parse(payloadJson);
    if (typeof payload.sub === "string") return payload.sub;
  } catch {
    // Invalid JWT
    return null;
  }

  // Strip the signature
  return token.slice(0, secondDot) + ".obfuscated";
}

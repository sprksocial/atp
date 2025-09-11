// counts the number of bytes in a utf8 string
export const utf8Len = (str: string): number => {
  return new TextEncoder().encode(str).byteLength;
};

// counts the number of graphemes (user-displayed characters) in a string
// Using Intl.Segmenter which is supported in Deno and modern browsers
export const graphemeLen = (str: string): number => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    return Array.from(segmenter.segment(str)).length;
  }

  // Fallback for environments without Intl.Segmenter
  // This is a simplified approach that handles basic cases
  return Array.from(str).length;
};

export const utf8ToB64Url = (utf8: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(utf8);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

export const b64UrlToUtf8 = (b64: string): string => {
  // Convert base64url to base64
  const base64 = b64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

export const parseLanguage = (langTag: string): LanguageTag | null => {
  const parsed = langTag.match(bcp47Regexp);
  if (!parsed?.groups) return null;
  const parts = parsed.groups;
  const result: LanguageTag = {};

  if (parts.grandfathered) result.grandfathered = parts.grandfathered;
  if (parts.language) result.language = parts.language;
  if (parts.extlang) result.extlang = parts.extlang;
  if (parts.script) result.script = parts.script;
  if (parts.region) result.region = parts.region;
  if (parts.variant) result.variant = parts.variant;
  if (parts.extension) result.extension = parts.extension;
  if (parts.privateUseA || parts.privateUseB) {
    result.privateUse = parts.privateUseA || parts.privateUseB;
  }

  return result;
};

export const validateLanguage = (langTag: string): boolean => {
  return bcp47Regexp.test(langTag);
};

export type LanguageTag = {
  grandfathered?: string;
  language?: string;
  extlang?: string;
  script?: string;
  region?: string;
  variant?: string;
  extension?: string;
  privateUse?: string;
};

// Validates well-formed BCP 47 syntax: https://www.rfc-editor.org/rfc/rfc5646.html#section-2.1
const bcp47Regexp =
  /^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUseA>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUseB>x(-[A-Za-z0-9]{1,8})+))$/;

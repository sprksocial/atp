import type { JwtHeader, JwtPayload } from "./jwt.ts";
import type { RequiredKey } from "./util.ts";

export type VerifyOptions<C extends string = never> = {
  audience?: string | readonly string[];
  /** in seconds */
  clockTolerance?: number;
  issuer?: string | readonly string[];
  /** in seconds */
  maxTokenAge?: number;
  subject?: string;
  typ?: string;
  currentDate?: Date;
  requiredClaims?: readonly C[];
};

export type VerifyResult<C extends string = never> = {
  payload: RequiredKey<JwtPayload, C>;
  protectedHeader: JwtHeader;
};

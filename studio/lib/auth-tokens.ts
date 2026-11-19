import { createHash, randomBytes } from "node:crypto";

export function createOpaqueToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

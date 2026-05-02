import crypto from "node:crypto";

export function createOpaqueToken(size = 24): string {
  return crypto.randomBytes(size).toString("base64url");
}

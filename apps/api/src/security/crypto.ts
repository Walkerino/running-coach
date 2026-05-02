import crypto from "node:crypto";

import { env } from "../config/env.js";

const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = env.ENCRYPTION_KEY.trim();
  const maybeBase64 = Buffer.from(raw, "base64");

  if (maybeBase64.length === KEY_LENGTH) {
    return maybeBase64;
  }

  const utf8 = Buffer.from(raw, "utf8");
  if (utf8.length === KEY_LENGTH) {
    return utf8;
  }

  return crypto.createHash("sha256").update(raw).digest();
}

export function encrypt(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(payload: string): string {
  const [ivRaw, tagRaw, encryptedRaw] = payload.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

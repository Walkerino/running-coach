import { describe, expect, it } from "vitest";

import { decrypt, encrypt } from "../src/security/crypto.js";

describe("crypto", () => {
  it("encrypts and decrypts with aes-256-gcm", () => {
    const secret = "refresh-token-value";
    const encrypted = encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(decrypt(encrypted)).toBe(secret);
  });
});

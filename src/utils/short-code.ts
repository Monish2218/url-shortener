import crypto from "node:crypto";

const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

const CODE_LENGTH = 10;

const MAX_BYTE = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

export function generateShortCode(): string {
  let code = "";

  while (code.length < CODE_LENGTH) {
    const bytes = crypto.randomBytes(CODE_LENGTH);

    for (const byte of bytes) {
      if (byte >= MAX_BYTE) {
        continue;
      }

      code += ALPHABET[byte % ALPHABET.length];

      if (code.length === CODE_LENGTH) {
        break;
      }
    }
  }

  return code;
}
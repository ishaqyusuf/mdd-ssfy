import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

// Displayed once in the authenticated dashboard. A public endpoint must apply
// an independent, shared rate limit before looking up a submitted code.
export function createConnectionCode(): string {
  return randomInt(0, 1_000_000_000_000).toString().padStart(12, "0");
}

export function hashConnectionCode(code: string, secret: string): string {
  if (!/^\d{12}$/.test(code)) throw new Error("Invalid connection code format");
  if (secret.length < 32) throw new Error("Connection code secret unavailable");
  return createHmac("sha256", secret).update("gnd-messaging-code-v1:").update(code).digest("hex");
}

// This is an independent extension credential, never a Better Auth web cookie.
export function createExtensionCredential(): string {
  return `gnd_msg_${randomBytes(32).toString("base64url")}`;
}

export function hashExtensionCredential(credential: string): string {
  if (!/^gnd_msg_[A-Za-z0-9_-]{43}$/.test(credential)) {
    throw new Error("Invalid extension credential format");
  }
  return createHash("sha256").update(credential).digest("hex");
}

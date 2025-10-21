import crypto from "crypto";

const ALGO = "aes-256-ctr"; // fast & safe for short data
console.log([process.env.ENC_SECRET_KEY]);
const SECRET = crypto
  .createHash("sha256")
  .update(
    // "your-secret-key"
    process.env.ENC_SECRET_KEY!
  )
  .digest(); // 32 bytes key
// export function encodeData2(data) {
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv(ALGO, SECRET, iv);
//   const encrypted = Buffer.concat([
//     cipher.update(JSON.stringify(data), "utf8"),
//     cipher.final(),
//   ]);
//   const token = Buffer.concat([iv, encrypted]).toString("base64");
//   return token; // looks shorter and random like a UUID
// }
// export function decodeToken2(token) {
//   const buffer = Buffer.from(token, "base64");
//   const iv = buffer.subarray(0, 16);
//   const encrypted = buffer.subarray(16);
//   const decipher = crypto.createDecipheriv(ALGO, SECRET, iv);
//   const decrypted = Buffer.concat([
//     decipher.update(encrypted),
//     decipher.final(),
//   ]);
//   return JSON.parse(decrypted.toString("utf8"));
// }

// export function encodeData(data) {
//   const iv = crypto.randomBytes(16);
//   const cipher = crypto.createCipheriv(ALGO, SECRET, iv);
//   const encrypted = Buffer.concat([
//     cipher.update(JSON.stringify(data), "utf8"),
//     cipher.final(),
//   ]);
//   // combine iv + encrypted data → base64
//   return iv.toString("hex") + ":" + encrypted.toString("base64");
// }
// export function decodeData(token) {
//   const [ivHex, encrypted] = token.split(":");
//   const iv = Buffer.from(ivHex, "hex");
//   const decipher = crypto.createDecipheriv(ALGO, SECRET, iv);
//   const decrypted = Buffer.concat([
//     decipher.update(Buffer.from(encrypted, "base64")),
//     decipher.final(),
//   ]);
//   return JSON.parse(decrypted.toString("utf8"));
// }

export function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, SECRET, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"),
    cipher.final(),
  ]);
  const token = Buffer.concat([iv, encrypted]).toString("base64url"); // ✅ URL-safe
  return token;
}

export function decrypt(token) {
  try {
    const buffer = Buffer.from(token, "base64url");
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    const decipher = crypto.createDecipheriv(ALGO, SECRET, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8"));
  } catch (err) {
    console.error("Decode failed:", err.message);
    return null;
  }
}

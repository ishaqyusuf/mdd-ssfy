import jwt from "jsonwebtoken";

const SECRET = process.env.ENC_SECRET_KEY!;
export function jwtEncrypt(data) {
  return jwt.sign(data, SECRET, { expiresIn: "1h" });
}

export function jwtDecrypt(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

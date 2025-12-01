import { hash } from "bcrypt-ts";
export async function hashPassword(pwrd) {
  return await hash(pwrd, 10);
}

"use server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
export async function getGuestId() {
  const cookie = await cookies();
  let value = cookie.get("millwork-guest-id")?.value;
  if (!value) {
    value = nanoid();
    cookie.set("millwork-guest-id", value);
  }
  return value;
}

import { env } from "@/env.mjs";
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export async function POST() {}

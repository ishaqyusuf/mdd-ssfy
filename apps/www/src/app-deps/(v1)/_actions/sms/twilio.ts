"use server";

import { env } from "@/env.mjs";
// import twilio from "twilio";
export async function sendMsg(to, body) {
    // const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_ACCOUNT_TOKEN);
    // await client.messages.create({
    //     body,
    //     to,
    //     from: env.TWILIO_PHONE
    // });
}


"use server";

import { resend } from "@/lib/resend";
// import { Resend } from "resend";

interface Props {
    from;
    user;
    subject;
    react;
    // to,
}
//

export async function _email({ from, user, subject, react }: Props) {
    const isProd = process.env.NEXT_PUBLIC_NODE_ENV === "production";
    // console.log(isProd,process.env.NEXT_PUBLIC_NODE_ENV);
    // return;
    // const resend = new Resend(env.RESEND_API_KEY);

    await resend.emails.send({
        from,
        // to:  "ishaqyusuf024@gmail.com",
        to: isProd ? user.email : "ishaqyusuf024@gmail.com",
        // cc: isProd ? [] : "ishaqyusuf024@gmail.com",
        subject,
        react,
    });
}

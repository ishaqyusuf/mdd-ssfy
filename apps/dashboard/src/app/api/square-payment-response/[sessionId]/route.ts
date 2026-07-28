import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }) {
    // if (req.method !== "POST")

    //     return res.status(405).json({ message: "Method Not Allowed" });
    // const {};
    const id = ""; // req.query.sessionId;
    return NextResponse.json({
        status: "Payment Successful",
    });
}

// app/api/download/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // 👈 REQUIRED

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const fileUrl =
        searchParams.get("url") ??
        "https://expo.dev/artifacts/eas/2FnxTdEff3pRrfULnr3JXa.apk";

    const filename = searchParams.get("name") ?? "GND-Millwork.apk";

    const res = await fetch(fileUrl);

    if (!res.ok || !res.body) {
        return NextResponse.json(
            { error: "Failed to fetch file" },
            { status: 400 }
        );
    }

    return new NextResponse(res.body, {
        headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}


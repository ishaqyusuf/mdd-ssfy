// app/api/download/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // 👈 REQUIRED

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const appId = "wzndhMn6VCH7sv11V7KJ4Q";
    const versionNumber = "1.0.305";
    const fileUrl =
        searchParams.get("url") ??
        `https://expo.dev/artifacts/eas/${appId}.apk`;

    const filename =
        searchParams.get("name") ?? `GND-Millwork ${versionNumber}.apk`;

    const res = await fetch(fileUrl);

    if (!res.ok || !res.body) {
        return NextResponse.json(
            { error: "Failed to fetch file" },
            { status: 400 },
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


// app/api/download/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const fileUrl =
        searchParams.get("url") ??
        "https://expo.dev/artifacts/eas/2FnxTdEff3pRrfULnr3JXa.apk";
    const filename = searchParams.get("name") ?? "GND Millwork.apk";

    if (!fileUrl) {
        return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const res = await fetch(fileUrl, {
        headers: {
            Accept: "application/octet-stream",
        },
    });
    // return NextResponse.json({});

    if (!res.ok) {
        return NextResponse.json(
            { error: "Failed to fetch file" },
            { status: 400 }
        );
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
        headers: {
            "Content-Type": "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}


import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const runtime = "nodejs";

export async function GET() {
    const setting = await prisma.settings.findFirst({
        where: {
            type: "app-download-apk",
        },
        select: {
            meta: true,
        },
    });

    const meta = (setting?.meta || {}) as {
        downloadUrl?: string | null;
        fileName?: string | null;
        version?: string | null;
    };
    const fileUrl = meta.downloadUrl?.trim();

    if (!fileUrl) {
        return NextResponse.json(
            { error: "No APK has been uploaded yet." },
            { status: 404 },
        );
    }

    const filename =
        meta.fileName?.trim() ||
        `GND-Millwork${meta.version ? `-${meta.version}` : ""}.apk`;

    const res = await fetch(fileUrl);

    if (!res.ok || !res.body) {
        return NextResponse.json(
            { error: "Failed to fetch the uploaded APK file." },
            { status: 400 },
        );
    }

    return new NextResponse(res.body, {
        headers: {
            "Content-Type":
                res.headers.get("content-type") ||
                "application/vnd.android.package-archive",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
        },
    });
}

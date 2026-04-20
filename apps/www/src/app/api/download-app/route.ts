import { NextResponse } from "next/server";
import { prisma } from "@/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    // https://expo.dev/artifacts/eas/5JvtaSZHhYgbLXgTCsF8c.apk
    const appId = "Lapzmc2oAJVCe7NDDV3iA";
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
export async function ___GET() {
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
        expiresAt?: string | null;
    };
    const fileUrl = meta.downloadUrl?.trim();
    const expiresAt = meta.expiresAt ? new Date(meta.expiresAt) : null;

    if (!fileUrl) {
        return NextResponse.json(
            { error: "No app download link has been configured yet." },
            { status: 404 },
        );
    }

    if (
        expiresAt &&
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt < new Date()
    ) {
        return NextResponse.json(
            { error: "This app download link has expired." },
            { status: 410 },
        );
    }

    try {
        new URL(fileUrl);
    } catch {
        return NextResponse.json(
            { error: "The configured app download link is invalid." },
            { status: 400 },
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


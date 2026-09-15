import { prisma } from "@/db";
import { getWebAuthSession } from "@gnd/auth/better-auth/www";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
	const session = await getWebAuthSession(req.headers);
	const userId = Number(session?.user?.id);
	if (!Number.isInteger(userId) || userId <= 0) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const employee = await prisma.users.findFirst({
		where: {
			id: userId,
			deletedAt: null,
			accessRevokedAt: null,
			OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
			roles: { some: { deletedAt: null, role: { deletedAt: null } } },
		},
		select: {
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
				select: { role: { select: { name: true } } },
			},
			mobileAccessRequests: {
				where: {
					platform: "ANDROID",
					status: { in: ["INVITED", "ACCEPTED", "INSTALLED"] },
				},
				select: { id: true },
				take: 1,
			},
		},
	});
	const isSuperAdmin = employee?.roles.some(
		({ role }) => role.name.toLowerCase() === "super admin",
	);
	if (
		!employee ||
		(!isSuperAdmin && employee.mobileAccessRequests.length === 0)
	) {
		return NextResponse.json(
			{ error: "Approved Android mobile access is required." },
			{ status: 403 },
		);
	}

	const appId = "GqAGsWE95IWmjJmVgUANhDvDFLaUkm-XyYQZTDNQk7U";
	const versionNumber = "1.0.305";
	const fileUrl = `https://expo.dev/artifacts/eas/${appId}.apk`;
	const filename = `GND-Millwork ${versionNumber}.apk`;
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

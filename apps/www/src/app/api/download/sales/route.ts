import { type NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
	const requestUrl = new URL(req.url);
	const redirectUrl = new URL("/api/download/sales-v2", requestUrl.origin);
	redirectUrl.search = requestUrl.search;

	return NextResponse.redirect(redirectUrl, 307);
}

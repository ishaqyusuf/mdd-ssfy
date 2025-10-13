import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
    const response = await getLoggedInProfile();
    return Response.json(response);
}

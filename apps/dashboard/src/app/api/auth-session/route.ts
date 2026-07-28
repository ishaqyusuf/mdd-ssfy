import { getServerAuthSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export async function GET() {
    const session = await getServerAuthSession();
    return Response.json(session);
}

export const POST = GET;

import { authOptions } from "@/lib/auth-options";
import { toAuthSnapshot } from "@/lib/auth/auth-snapshot";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";
export async function POST() {
	const session = await getServerSession(authOptions);
	const response = toAuthSnapshot(session);
	return Response.json(response);
}

import { getEmployeeDocumentActor } from "@/lib/employee-document-auth";
import {
	employeeDocumentError,
	serveEmployeeDocument,
} from "@api/services/employee-document-file";
import { db } from "@gnd/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
	params: Promise<{ documentId: string }>;
};

async function serve(
	request: Request,
	context: RouteContext,
	headOnly: boolean,
) {
	const actor = await getEmployeeDocumentActor(new Headers(request.headers));
	if (!actor) {
		return employeeDocumentError(401, "Sign in required.");
	}
	const { documentId } = await context.params;
	return serveEmployeeDocument({
		db,
		documentId: Number(documentId),
		actor,
		request,
		headOnly,
	});
}

export function GET(request: Request, context: RouteContext) {
	return serve(request, context, false);
}

export function HEAD(request: Request, context: RouteContext) {
	return serve(request, context, true);
}

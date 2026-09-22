import "server-only";

import { getServerAuthSession } from "@/lib/auth/session";

export async function getEmployeeDocumentActor(headers?: Headers) {
	const session = await getServerAuthSession(headers);
	const actorId = Number(session?.user?.id);
	if (!Number.isSafeInteger(actorId) || actorId <= 0) return null;

	return {
		id: actorId,
		canViewEmployeeDocument: session?.can?.viewEmployeeDocument === true,
		canEditEmployeeDocument: session?.can?.editEmployeeDocument === true,
	};
}

export async function requireEmployeeDocumentViewer() {
	const actor = await getEmployeeDocumentActor();
	if (
		!actor ||
		(!actor.canViewEmployeeDocument && !actor.canEditEmployeeDocument)
	) {
		throw new Error("You do not have permission to view employee documents.");
	}
	return actor;
}

export async function requireEmployeeDocumentEditor() {
	const actor = await getEmployeeDocumentActor();
	if (!actor?.canEditEmployeeDocument) {
		throw new Error("You do not have permission to review employee documents.");
	}
	return actor;
}

export type BugReportDocumentAccess = {
	actorId: number;
	isSuperAdmin: boolean;
	reportOwnerId: number;
	primaryDocumentId: string | null;
	followUpDocumentIds: readonly (string | null)[];
	documentId: string;
};

export function canAccessBugReportDocument(input: BugReportDocumentAccess) {
	if (!input.isSuperAdmin && input.actorId !== input.reportOwnerId)
		return false;
	return (
		input.primaryDocumentId === input.documentId ||
		input.followUpDocumentIds.some((id) => id === input.documentId)
	);
}

export function bugReportDocumentUrl(reportId: string, documentId: string) {
	return `/api/bug-reports/${encodeURIComponent(reportId)}/documents/${encodeURIComponent(documentId)}`;
}

import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { del, put } from "@vercel/blob";

export function getEmployeeDocumentBlobToken() {
	const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN?.trim();
	if (!token) {
		throw new Error("Private employee document storage is not configured.");
	}
	return token;
}

export function createEmployeeDocumentService() {
	return createApiVercelBlobDocumentService({
		put,
		del,
		token: getEmployeeDocumentBlobToken(),
		access: "private",
	});
}

export async function deleteEmployeeDocumentBlob(pathname: string) {
	await del(pathname, { token: getEmployeeDocumentBlobToken() });
}

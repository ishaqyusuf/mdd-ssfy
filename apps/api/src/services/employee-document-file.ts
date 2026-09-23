import { resolveEmployeeDocumentAccess } from "@api/db/queries/employee-documents";
import { getEmployeeDocumentBlobToken } from "@api/utils/employee-document-storage";
import type { Db } from "@gnd/db";
import { get, head } from "@vercel/blob";

type EmployeeDocumentFileActor = {
	id: number;
	canViewEmployeeDocument?: boolean;
	canEditEmployeeDocument?: boolean;
};

type ReadableHeaders = {
	get(name: string): string | null;
};

export function employeeDocumentError(status: 401 | 404 | 503, message: string) {
	return Response.json(
		{ error: message },
		{
			status,
			headers: {
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		},
	);
}

function copyHeader(target: Headers, source: ReadableHeaders, name: string) {
	const value = source.get(name);
	if (value) target.set(name, value);
}

function safeFilename(value: string | null | undefined) {
	return (value || "employee-document").replace(/["\r\n]/g, "");
}

function fileHeaders(input: {
	contentType: string | null;
	filename: string;
	source?: ReadableHeaders;
}) {
	const headers = new Headers({
		"Content-Type": input.contentType || "application/octet-stream",
		"Content-Disposition": `inline; filename="${safeFilename(input.filename)}"`,
		"Cache-Control": "private, no-store",
		"X-Content-Type-Options": "nosniff",
	});
	if (input.source) {
		for (const name of [
			"accept-ranges",
			"content-length",
			"content-range",
			"etag",
		]) {
			copyHeader(headers, input.source, name);
		}
	}
	return headers;
}

export async function serveEmployeeDocument(input: {
	db: Db;
	documentId: number;
	actor: EmployeeDocumentFileActor;
	request: Request;
	headOnly?: boolean;
}) {
	const document = await resolveEmployeeDocumentAccess(input.db, {
		documentId: input.documentId,
		actor: input.actor,
	});
	if (!document) {
		return employeeDocumentError(404, "File not found.");
	}

	try {
		if (document.access === "private") {
			const token = getEmployeeDocumentBlobToken();
			if (input.headOnly) {
				const metadata = await head(document.pathname, { token });
				return new Response(null, {
					status: 200,
					headers: fileHeaders({
						contentType: document.mimeType || metadata.contentType,
						filename: document.filename,
						source: new Headers({
							"accept-ranges": "bytes",
							"content-length": String(metadata.size),
							etag: metadata.etag,
						}),
					}),
				});
			}
			const range = input.request.headers.get("range");
			const result = await get(document.pathname, {
				access: "private",
				token,
				useCache: false,
				...(range ? { headers: { Range: range } } : {}),
			});
			if (!result || result.statusCode === 304 || !result.stream) {
				return employeeDocumentError(404, "File not found.");
			}
			return new Response(result.stream, {
				status: result.headers.has("content-range") ? 206 : 200,
				headers: fileHeaders({
					contentType: document.mimeType || result.blob.contentType,
					filename: document.filename,
					source: result.headers,
				}),
			});
		}

		const legacyHeaders = new Headers();
		const range = input.request.headers.get("range");
		if (range) legacyHeaders.set("range", range);
		const response = await fetch(document.url, {
			method: input.headOnly ? "HEAD" : "GET",
			headers: legacyHeaders,
			cache: "no-store",
			redirect: "error",
		});
		if (!response.ok || (!input.headOnly && !response.body)) {
			return employeeDocumentError(404, "File not found.");
		}
		return new Response(input.headOnly ? null : response.body, {
			status: response.status === 206 ? 206 : 200,
			headers: fileHeaders({
				contentType: document.mimeType || response.headers.get("content-type"),
				filename: document.filename,
				source: response.headers,
			}),
		});
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === "Private employee document storage is not configured."
		) {
			return employeeDocumentError(
				503,
				"Private employee document storage is not configured.",
			);
		}
		return employeeDocumentError(404, "File not found.");
	}
}

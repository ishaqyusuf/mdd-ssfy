import type { DocumentUploadInput } from "./types";

export function normalizePathname(pathname: string) {
	return pathname
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+/g, "/");
}

export function withFolder(pathname: string, folder?: string) {
	const normalizedPath = normalizePathname(pathname);
	const normalizedFolder = folder ? normalizePathname(folder) : "";
	return normalizedFolder
		? `${normalizedFolder}/${normalizedPath}`
		: normalizedPath;
}

export function fileNameFrom(input: DocumentUploadInput) {
	return normalizePathname(input.filename).split("/").pop() || "document";
}

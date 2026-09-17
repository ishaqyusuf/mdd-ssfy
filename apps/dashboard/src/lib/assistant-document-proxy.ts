import { trustedAssistantPublicBlobUrl } from "@api/assistant/documents";

type AssistantProxyDocument = {
	access: "private" | "public";
	pathname: string;
	url?: string | null;
};

type AssistantDocumentProxyDependencies = {
	getPrivate(
		pathname: string,
		token: string,
	): Promise<{
		statusCode: number;
		stream: BodyInit | null;
		contentType: string | null;
	} | null>;
	fetchPublic(url: string): Promise<Response>;
};

export async function loadAssistantDocumentProxy(
	document: AssistantProxyDocument,
	token: string | undefined,
	dependencies: AssistantDocumentProxyDependencies,
) {
	try {
		if (document.access === "private") {
			if (!token) return { status: "storage-unavailable" as const };
			const result = await dependencies.getPrivate(document.pathname, token);
			if (!result || result.statusCode !== 200 || !result.stream) {
				return { status: "not-found" as const };
			}
			return {
				status: "ready" as const,
				body: result.stream,
				contentType: result.contentType,
			};
		}

		const trustedUrl = trustedAssistantPublicBlobUrl(document.url);
		if (!trustedUrl) return { status: "not-found" as const };
		const response = await dependencies.fetchPublic(trustedUrl);
		if (!response.ok || !response.body) return { status: "not-found" as const };
		return {
			status: "ready" as const,
			body: response.body,
			contentType: response.headers.get("content-type"),
		};
	} catch {
		return { status: "not-found" as const };
	}
}

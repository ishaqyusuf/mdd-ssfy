import type {
	DocumentDeleteInput,
	DocumentDeleteResult,
	DocumentProvider,
	DocumentUploadInput,
	DocumentUploadResult,
} from "../types";
import { fileNameFrom, normalizePathname, withFolder } from "../utils";

export type VercelBlobPutResult = {
	url: string;
	pathname: string;
	contentType?: string;
	size?: number;
};

export type VercelBlobProviderOptions = {
	put: (
		pathname: string,
		body: DocumentUploadInput["body"],
		options?: {
			access?: "public";
			contentType?: string;
			token?: string;
			addRandomSuffix?: boolean;
			cacheControlMaxAge?: number;
		},
	) => Promise<VercelBlobPutResult>;
	del?: (urlOrPathname: string, options?: { token?: string }) => Promise<void>;
	token?: string;
	access?: "public";
	addRandomSuffix?: boolean;
	cacheControlMaxAge?: number;
};

export function createVercelBlobProvider(
	options: VercelBlobProviderOptions,
): DocumentProvider {
	return {
		name: "vercel-blob",
		async upload(input): Promise<DocumentUploadResult> {
			const pathname = withFolder(fileNameFrom(input), input.folder);
			const uploaded = await options.put(pathname, input.body, {
				access: options.access || "public",
				token: options.token,
				contentType: input.contentType,
				addRandomSuffix: options.addRandomSuffix,
				cacheControlMaxAge: options.cacheControlMaxAge,
			});
			return {
				provider: "vercel-blob",
				pathname: normalizePathname(uploaded.pathname || pathname),
				url: uploaded.url,
				size: uploaded.size,
				contentType: uploaded.contentType || input.contentType,
				filename: fileNameFrom(input),
				raw: uploaded,
			};
		},
		async delete(input: DocumentDeleteInput): Promise<DocumentDeleteResult> {
			if (!options.del) {
				throw new Error("Vercel Blob delete function not configured");
			}
			await options.del(input.pathname, { token: options.token });
			return { ok: true };
		},
		getPublicUrl(pathname: string) {
			return pathname;
		},
	};
}

import type {
	DocumentDeleteInput,
	DocumentDeleteResult,
	DocumentProvider,
	DocumentUploadInput,
	DocumentUploadResult,
} from "../types";
import { fileNameFrom, normalizePathname, withFolder } from "../utils";

export type CloudinaryUploadResult = {
	public_id: string;
	secure_url: string;
	bytes?: number;
	etag?: string;
	resource_type?: string;
	format?: string;
};

export type CloudinaryProviderOptions = {
	upload: (input: {
		body: DocumentUploadInput["body"];
		folder?: string;
		filename: string;
		contentType?: string;
		metadata?: Record<string, unknown>;
	}) => Promise<CloudinaryUploadResult>;
	destroy?: (publicId: string) => Promise<{ result?: string }>;
	baseUrl?: string;
};

export function createCloudinaryProvider(
	options: CloudinaryProviderOptions,
): DocumentProvider {
	return {
		name: "cloudinary",
		async upload(input): Promise<DocumentUploadResult> {
			const filename = fileNameFrom(input);
			const folder = input.folder ? normalizePathname(input.folder) : undefined;
			const uploaded = await options.upload({
				body: input.body,
				folder,
				filename,
				contentType: input.contentType,
				metadata: input.metadata,
			});
			const pathname = normalizePathname(
				uploaded.public_id || withFolder(filename, folder),
			);
			return {
				provider: "cloudinary",
				pathname,
				url: uploaded.secure_url,
				size: uploaded.bytes,
				contentType: input.contentType,
				filename,
				etag: uploaded.etag,
				raw: uploaded,
			};
		},
		async delete(input: DocumentDeleteInput): Promise<DocumentDeleteResult> {
			if (!options.destroy) {
				throw new Error("Cloudinary destroy function not configured");
			}
			const response = await options.destroy(input.pathname);
			return {
				ok: response?.result === "ok" || response?.result === "not found",
				raw: response,
			};
		},
		getPublicUrl(pathname: string) {
			if (!options.baseUrl) return undefined;
			return `${options.baseUrl.replace(/\/$/, "")}/${normalizePathname(pathname)}`;
		},
	};
}

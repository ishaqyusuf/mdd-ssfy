import type {
	DocumentDeleteInput,
	DocumentDeleteResult,
	DocumentProvider,
	DocumentUploadInput,
	DocumentUploadResult,
} from "./types";

export type DocumentService = {
	provider: DocumentProvider;
	upload(input: DocumentUploadInput): Promise<DocumentUploadResult>;
	uploadMany(inputs: DocumentUploadInput[]): Promise<DocumentUploadResult[]>;
	delete(input: DocumentDeleteInput): Promise<DocumentDeleteResult>;
	getPublicUrl(pathname: string): string | undefined;
};

export function createDocumentService(
	provider: DocumentProvider,
): DocumentService {
	return {
		provider,
		upload(input) {
			return provider.upload(input);
		},
		async uploadMany(inputs) {
			if (provider.uploadMany) {
				return provider.uploadMany(inputs);
			}
			return Promise.all(inputs.map((input) => provider.upload(input)));
		},
		async delete(input) {
			if (!provider.delete) {
				throw new Error(
					`Document provider \"${provider.name}\" does not support delete`,
				);
			}
			return provider.delete(input);
		},
		getPublicUrl(pathname) {
			if (!provider.getPublicUrl) return undefined;
			return provider.getPublicUrl(pathname);
		},
	};
}

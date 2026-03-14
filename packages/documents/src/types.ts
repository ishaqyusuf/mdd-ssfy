export type DocumentProviderName = "vercel-blob" | "cloudinary" | (string & {});

export type DocumentFolder = string;

export type DocumentUploadInput = {
	filename: string;
	contentType?: string;
	folder?: DocumentFolder;
	body:
		| Blob
		| File
		| Buffer
		| ArrayBuffer
		| Uint8Array
		| ReadableStream
		| string;
	metadata?: Record<string, unknown>;
};

export type DocumentUploadResult = {
	provider: DocumentProviderName;
	pathname: string;
	url?: string;
	size?: number;
	contentType?: string;
	filename?: string;
	etag?: string;
	raw?: unknown;
};

export type DocumentDeleteInput = {
	pathname: string;
};

export type DocumentDeleteResult = {
	ok: boolean;
	raw?: unknown;
};

export type DocumentProvider = {
	readonly name: DocumentProviderName;
	upload(input: DocumentUploadInput): Promise<DocumentUploadResult>;
	uploadMany?(inputs: DocumentUploadInput[]): Promise<DocumentUploadResult[]>;
	delete?(input: DocumentDeleteInput): Promise<DocumentDeleteResult>;
	getPublicUrl?(pathname: string): string;
};

import {
  type DocumentService,
  type DocumentUploadInput,
  createCloudinaryProvider,
  createDocumentService,
  createVercelBlobProvider,
} from "@gnd/documents";

export type ApiDocumentProviderName = "vercel-blob" | "cloudinary";

type VercelBlobPut = typeof import("@vercel/blob").put;

export function getApiDocumentProviderFromEnv(): ApiDocumentProviderName {
  const provider = String(process.env.DOCUMENT_PROVIDER || "vercel-blob")
    .trim()
    .toLowerCase();
  return provider === "cloudinary" ? "cloudinary" : "vercel-blob";
}

export function createApiVercelBlobDocumentService(options: {
  put: VercelBlobPut;
  del?: (urlOrPathname: string, options?: { token?: string }) => Promise<void>;
  token?: string;
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
}) {
  return createDocumentService(
    createVercelBlobProvider({
      put: (pathname, body, putOptions) =>
        options.put(
          pathname,
          body as Parameters<VercelBlobPut>[1],
          putOptions as Parameters<VercelBlobPut>[2],
        ),
      del: options.del,
      token: options.token || process.env.BLOB_READ_WRITE_TOKEN,
      access: "public",
      addRandomSuffix: options.addRandomSuffix ?? true,
      allowOverwrite: options.allowOverwrite,
    }),
  );
}

export function createApiCloudinaryDocumentService(options: {
  upload: (input: {
    body: DocumentUploadInput["body"];
    folder?: string;
    filename: string;
    contentType?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<{
    public_id: string;
    secure_url: string;
    bytes?: number;
    etag?: string;
    resource_type?: string;
    format?: string;
  }>;
  destroy?: (publicId: string) => Promise<{ result?: string }>;
  baseUrl?: string;
}) {
  return createDocumentService(
    createCloudinaryProvider({
      upload: options.upload,
      destroy: options.destroy,
      baseUrl: options.baseUrl || process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
    }),
  );
}

export function createApiDocumentServiceByProvider(providers: {
  vercelBlob?: DocumentService;
  cloudinary?: DocumentService;
}) {
  const provider = getApiDocumentProviderFromEnv();
  if (provider === "cloudinary") {
    if (!providers.cloudinary) {
      throw new Error("Cloudinary document service is not configured");
    }
    return providers.cloudinary;
  }
  if (!providers.vercelBlob) {
    throw new Error("Vercel Blob document service is not configured");
  }
  return providers.vercelBlob;
}

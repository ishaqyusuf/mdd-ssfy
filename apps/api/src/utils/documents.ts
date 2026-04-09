import {
  type DocumentService,
  type DocumentUploadInput,
  createCloudinaryProvider,
  createDocumentService,
  createVercelBlobProvider,
} from "@gnd/documents";

type ApiDocumentProviderName = "vercel-blob" | "cloudinary";

function getApiDocumentProviderFromEnv(): ApiDocumentProviderName {
  const provider = String(process.env.DOCUMENT_PROVIDER || "vercel-blob")
    .trim()
    .toLowerCase();
  return provider === "cloudinary" ? "cloudinary" : "vercel-blob";
}

export function createApiVercelBlobDocumentService(options: {
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
  ) => Promise<{
    url: string;
    pathname: string;
    contentType?: string;
    size?: number;
  }>;
  del?: (urlOrPathname: string, options?: { token?: string }) => Promise<void>;
  token?: string;
}) {
  return createDocumentService(
    createVercelBlobProvider({
      put: options.put,
      del: options.del,
      token: options.token || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
      access: "public",
      addRandomSuffix: true,
    }),
  );
}

function createApiCloudinaryDocumentService(options: {
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

function createApiDocumentServiceByProvider(providers: {
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

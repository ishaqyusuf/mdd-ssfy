const defaultCloudinaryBaseUrl =
  "https://res.cloudinary.com/dsuwvkg3d/image/upload/v1705575174";

export function resolveWorkflowComponentImageSrc(
  src?: string | null,
  baseUrl = defaultCloudinaryBaseUrl,
) {
  const value = String(src || "").trim();
  if (!value) return null;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const base = String(baseUrl || defaultCloudinaryBaseUrl).replace(/\/$/, "");
  const normalized = value.replace(/^\//, "");
  if (!normalized) return null;
  if (normalized.startsWith("dyke/")) return `${base}/${normalized}`;
  return `${base}/dyke/${normalized}`;
}

export function createWorkflowComponentImageResolver(baseUrl?: string | null) {
  return (src?: string | null) =>
    resolveWorkflowComponentImageSrc(src, baseUrl || defaultCloudinaryBaseUrl);
}

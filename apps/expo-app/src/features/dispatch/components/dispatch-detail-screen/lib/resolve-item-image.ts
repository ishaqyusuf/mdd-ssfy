export function resolveItemImage(img?: string | null) {
  if (!img) return null;
  if (/^https?:\/\//i.test(img)) return img;

  const base =
    process.env.EXPO_PUBLIC_CLOUDINARY_BASE_URL ||
    process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL;
  if (!base) return null;

  const normalizedBase = String(base).replace(/\/+$/, "");
  const normalizedPath = img.replace(/^\/+/, "");
  const pathWithBucket = normalizedPath.startsWith("dyke/")
    ? normalizedPath
    : `dyke/${normalizedPath}`;

  return `${normalizedBase}/${pathWithBucket}`;
}

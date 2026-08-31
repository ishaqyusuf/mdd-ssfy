export function isSvgImageSource(value: string | null | undefined) {
	const source = String(value || "").trim();
	return (
		/^data:image\/svg\+xml(?:[;,]|$)/i.test(source) ||
		/\.svg(?:[?#].*)?$/i.test(source)
	);
}

export function extractSignaturePathFromSvg(value: string) {
	const match = /<path\b[^>]*\bd=(['"])(.*?)\1/i.exec(value);
	const path = match?.[2]?.trim() || "";
	return /^[ML0-9., \-]+$/.test(path) ? path : null;
}

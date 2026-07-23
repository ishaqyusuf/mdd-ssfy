import { TRPCError } from "@trpc/server";

export const supportedDocumentMimeTypes = [
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/avif",
	"image/heic",
	"image/heif",
	"application/pdf",
] as const;

export type SupportedDocumentMimeType =
	(typeof supportedDocumentMimeTypes)[number];

function hasBytes(body: Buffer, offset: number, bytes: number[]) {
	return bytes.every((byte, index) => body[offset + index] === byte);
}

function hasIsoBaseMediaBrand(body: Buffer, brands: string[]) {
	if (body.length < 12 || body.subarray(4, 8).toString("ascii") !== "ftyp") {
		return false;
	}
	return brands.includes(body.subarray(8, 12).toString("ascii"));
}

function matchesMimeType(body: Buffer, contentType: SupportedDocumentMimeType) {
	switch (contentType) {
		case "image/png":
			return hasBytes(
				body,
				0,
				[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
			);
		case "image/jpeg":
			return hasBytes(body, 0, [0xff, 0xd8, 0xff]);
		case "image/webp":
			return (
				body.length >= 12 &&
				body.subarray(0, 4).toString("ascii") === "RIFF" &&
				body.subarray(8, 12).toString("ascii") === "WEBP"
			);
		case "image/avif":
			return hasIsoBaseMediaBrand(body, ["avif", "avis"]);
		case "image/heic":
		case "image/heif":
			return hasIsoBaseMediaBrand(body, [
				"heic",
				"heix",
				"hevc",
				"hevx",
				"heim",
				"heis",
				"mif1",
				"msf1",
			]);
		case "application/pdf":
			return body.subarray(0, 5).toString("ascii") === "%PDF-";
	}
}

export function decodeValidatedDocumentBase64(input: {
	content: string;
	contentType: SupportedDocumentMimeType;
	maxBytes?: number;
}) {
	const maxBytes = input.maxBytes ?? 8_000_000;
	const body = Buffer.from(input.content, "base64");
	if (!body.length || body.length > maxBytes) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `Document upload must be between 1 byte and ${Math.floor(maxBytes / 1_000_000)} MB.`,
		});
	}
	if (
		body.toString("base64") !== input.content ||
		!matchesMimeType(body, input.contentType)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Document bytes do not match the declared file type.",
		});
	}
	return body;
}

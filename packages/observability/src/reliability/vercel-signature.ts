import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyVercelSignature(
	request: { rawBody: Uint8Array; signature: string },
	secret: string,
) {
	if (request.rawBody.byteLength > 1_048_576)
		throw new Error("Vercel payload too large");
	if (!secret || !/^[a-f0-9]{40}$/.test(request.signature))
		throw new Error("Invalid Vercel signature");
	const digest = createHmac("sha1", secret).update(request.rawBody).digest();
	if (!timingSafeEqual(digest, Buffer.from(request.signature, "hex")))
		throw new Error("Invalid Vercel signature");
}

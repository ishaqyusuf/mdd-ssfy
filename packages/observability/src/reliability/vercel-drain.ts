import { verifyVercelSignature } from "./vercel-signature";

/** Transport authentication only. Returned records still require source validation. */
export function verifyVercelDrain(
	request: { rawBody: Uint8Array; signature: string },
	secret: string,
	format: "json" | "ndjson",
): Record<string, unknown>[] {
	verifyVercelSignature(request, secret);
	try {
		const text = new TextDecoder("utf-8", { fatal: true }).decode(
			request.rawBody,
		);
		const batch: unknown =
			format === "json"
				? JSON.parse(text)
				: text
						.split("\n")
						.filter((line) => line.trim())
						.map((line) => JSON.parse(line));
		if (
			!Array.isArray(batch) ||
			batch.length > 1000 ||
			batch.some(
				(entry) => !entry || typeof entry !== "object" || Array.isArray(entry),
			)
		)
			throw new Error("Invalid batch");
		return batch;
	} catch {
		throw new Error("Invalid Vercel batch");
	}
}

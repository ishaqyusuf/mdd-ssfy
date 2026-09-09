export type GithubRequest = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

export async function readBoundedJson(response: Response, limit: number) {
	const reader = response.body?.getReader();
	if (!reader) throw new Error("Missing response body");
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > limit) throw new Error("Response too large");
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

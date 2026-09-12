const MAX_BYTES = 48 * 1024;

export async function readBatchBody(
	request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; status: 400 | 413 }> {
	if (!request.body) return { ok: false, status: 400 };
	const reader = request.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let body = "";
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			bytes += chunk.value.byteLength;
			if (bytes > MAX_BYTES) {
				await reader.cancel().catch(() => undefined);
				return { ok: false, status: 413 };
			}
			body += decoder.decode(chunk.value, { stream: true });
		}
		body += decoder.decode();
		return { ok: true, body: JSON.parse(body) };
	} catch {
		return { ok: false, status: 400 };
	} finally {
		reader.releaseLock();
	}
}

const MAX_BYTES = 48 * 1024;

export async function readBatchBody(
	request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; status: 400 | 413 }> {
	if (!request.body) return { ok: false, status: 400 };
	const contentLength = Number(request.headers.get("content-length") ?? 0);
	if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
		return { ok: false, status: 413 };
	}
	try {
		const body = await request.arrayBuffer();
		if (body.byteLength > MAX_BYTES) return { ok: false, status: 413 };
		return { ok: true, body: JSON.parse(new TextDecoder().decode(body)) };
	} catch {
		return { ok: false, status: 400 };
	}
}

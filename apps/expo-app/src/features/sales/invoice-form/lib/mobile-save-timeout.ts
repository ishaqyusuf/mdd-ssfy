export const MOBILE_INVOICE_SAVE_TIMEOUT_MS = 30_000;

export class MobileInvoiceSaveTimeoutError extends Error {
	constructor(timeoutMs = MOBILE_INVOICE_SAVE_TIMEOUT_MS) {
		super(`Mobile invoice save did not finish within ${timeoutMs}ms.`);
		this.name = "MobileInvoiceSaveTimeoutError";
	}
}

export async function runMobileInvoiceSaveRequest<T>(
	save: () => Promise<T>,
	timeoutMs = MOBILE_INVOICE_SAVE_TIMEOUT_MS,
): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	try {
		return await Promise.race([
			Promise.resolve().then(save),
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => {
					reject(new MobileInvoiceSaveTimeoutError(timeoutMs));
				}, timeoutMs);
			}),
		]);
	} finally {
		if (timeout) clearTimeout(timeout);
	}
}

export function isMobileInvoiceSaveTimeoutError(error: unknown) {
	return (
		error instanceof MobileInvoiceSaveTimeoutError ||
		(error instanceof Error && error.name === "MobileInvoiceSaveTimeoutError")
	);
}

type UploadIntent = {
	id: string;
	createdById: number;
	pathname: string;
	expectedMimeType: string;
	expectedSize: number;
	state: "PENDING" | "READY" | "CONSUMED" | "EXPIRED";
	expiresAt: Date;
};

export function authorizeBugReportUpload(
	intent: UploadIntent | null,
	input: { actorId: number; pathname: string; now: Date },
) {
	if (
		!intent ||
		intent.createdById !== input.actorId ||
		intent.pathname !== input.pathname ||
		intent.state !== "PENDING" ||
		intent.expiresAt <= input.now
	) {
		throw new Error("Bug report upload intent is invalid or expired.");
	}
	return {
		intentId: intent.id,
		pathname: intent.pathname,
		contentType: intent.expectedMimeType,
		maximumSizeInBytes: intent.expectedSize,
	};
}

export function canCompleteBugReportUpload(
	intent: UploadIntent | null,
	input: {
		actorId: number;
		pathname: string;
		contentType: string;
		size: number;
		now: Date;
	},
) {
	return Boolean(
		intent &&
			intent.createdById === input.actorId &&
			intent.pathname === input.pathname &&
			["PENDING", "READY"].includes(intent.state) &&
			intent.expiresAt > input.now &&
			intent.expectedMimeType === input.contentType &&
			intent.expectedSize === input.size,
	);
}

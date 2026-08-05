import { classifyError, toPublicError } from "@gnd/errors";
import { TRPCError } from "@trpc/server";

export function normalizeTrpcError(error: unknown, operation?: string) {
	const classified = classifyError(error, { operation });

	return new TRPCError({
		cause: classified,
		code: classified.transportCode,
		message: classified.publicMessage,
	});
}

export function getTrpcPublicError(error: unknown) {
	return toPublicError(error);
}

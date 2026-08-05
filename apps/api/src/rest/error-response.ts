import { getPublicErrorHttpStatus, toPublicError } from "@gnd/errors";

export function getRestErrorResponse(error: unknown) {
	return {
		body: {
			error: toPublicError(error),
		},
		status: getPublicErrorHttpStatus(error),
	};
}

"use client";

import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";

export function useCreateFormQueryParams() {
	return useQueryStates({
		selectedCustomerId: parseAsInteger,
		salesRequestGeneration: parseAsString,
	});
}

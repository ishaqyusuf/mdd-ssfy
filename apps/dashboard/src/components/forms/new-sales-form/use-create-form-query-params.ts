"use client";

import { parseAsInteger, useQueryStates } from "nuqs";

export function useCreateFormQueryParams() {
	return useQueryStates({
		selectedCustomerId: parseAsInteger,
	});
}

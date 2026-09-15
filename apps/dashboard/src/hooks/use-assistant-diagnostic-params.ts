"use client";

import { parseAsString, useQueryState } from "nuqs";

export function useAssistantDiagnosticParams() {
	const [reference, setReference] = useQueryState(
		"assistantDiagnostic",
		parseAsString,
	);
	return { reference, setReference };
}

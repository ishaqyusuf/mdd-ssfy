"use client";

import {
	useQueryEvents,
	useTypedQueryInvalidation,
} from "@/lib/query-events/runtime";
import { useEffect, useRef } from "react";
import {
	collectAssistantInvalidations,
	dispatchAssistantInvalidations,
} from "./assistant-tool-invalidation";

export function useAssistantToolInvalidation(messages: readonly unknown[]) {
	const processed = useRef(new Set<string>());
	const queryEvents = useQueryEvents();
	const invalidate = useTypedQueryInvalidation();

	useEffect(() => {
		const events = collectAssistantInvalidations(messages, processed.current);
		void dispatchAssistantInvalidations(events, {
			emit: (event) => queryEvents.emit(event),
			invalidateGlobalSearch: () => invalidate.path("search.global"),
		});
	}, [invalidate, messages, queryEvents]);
}

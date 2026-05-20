"use client";

import { parseAsBoolean, parseAsInteger, parseAsJson, useQueryStates } from "nuqs";
import { z } from "zod";
import { useOnCloseQuery } from "./use-on-close-query";

export function useSalesProfileFormParams() {
	const onClose = useOnCloseQuery();
	const [params, setParams] = useQueryStates({
		salesProfileForm: parseAsBoolean,
		salesProfileId: parseAsInteger,
		onCloseQuery: parseAsJson(z.any().parse),
	});

	const opened = Boolean(params.salesProfileForm);

	return {
		params,
		setParams,
		opened,
		title: params.salesProfileId ? "Edit Sales Profile" : "Create Sales Profile",
		openCreate(onCloseQuery?: unknown) {
			setParams(
				{
					salesProfileForm: true,
					salesProfileId: null,
					onCloseQuery: onCloseQuery || null,
				},
				{ shallow: true, scroll: false },
			);
		},
		openEdit(salesProfileId: number, onCloseQuery?: unknown) {
			setParams(
				{
					salesProfileForm: true,
					salesProfileId,
					onCloseQuery: onCloseQuery || null,
				},
				{ shallow: true, scroll: false },
			);
		},
		close() {
			onClose.handle(params, setParams);
		},
	};
}

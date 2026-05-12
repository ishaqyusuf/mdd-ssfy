"use client";

import { SalesFormClient } from "@/components/forms/sales-form/sales-form";
import { useLayoutEffect, useMemo, useState } from "react";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { SalesFormDevSwitcher } from "@/components/forms/sales-form-dev-switcher";

export function FormClient({ data }) {
	const init = useFormDataStore((state) => state.init);
	const initialState = useMemo(() => zhInitializeState(data), [data]);
	const [isReady, setIsReady] = useState(false);
	const formKey = `${initialState.metaData?.type || "sale"}-${initialState.metaData?.id ?? "new"}-${initialState.metaData?.salesId ?? "draft"}`;

	useLayoutEffect(() => {
		setIsReady(false);
		init(initialState);
		setIsReady(true);
	}, [initialState, init]);

	if (!isReady) return null;

	return (
		<>
			<SalesFormDevSwitcher
				currentForm="old"
				type={data?.order?.type === "quote" ? "quote" : "order"}
				slug={data?.order?.slug}
				orderId={data?.order?.orderId}
			/>
			<SalesFormClient key={formKey} data={data} />
		</>
	);
}

"use client";

import { SalesFormClient } from "@/components/forms/sales-form/sales-form";
import { useLayoutEffect, useMemo, useState } from "react";

import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { LegacySalesFormPreferenceDialog } from "@/components/forms/legacy-sales-form-preference-dialog";
import { SalesFormAdoptionTracker } from "@/components/forms/sales-form-adoption-tracker";
import { SalesFormVersionSwitcher } from "@/components/forms/sales-form-version-switcher";
import { resolveApprovedAdjustmentLegacyAccess } from "@/domains/sales-form/legacy/application/approved-adjustment-access";

export function FormClient({
	data,
	mode,
	shouldPromptLegacyPreference = false,
}) {
	const init = useFormDataStore((state) => state.init);
	const initialState = useMemo(() => zhInitializeState(data), [data]);
	const [isReady, setIsReady] = useState(false);
	const adjustmentAccess = resolveApprovedAdjustmentLegacyAccess(data);
	const formKey = `${initialState.metaData?.type || "sale"}-${initialState.metaData?.id ?? "new"}-${initialState.metaData?.salesId ?? "draft"}`;

	useLayoutEffect(() => {
		setIsReady(false);
		init(initialState);
		setIsReady(true);
	}, [initialState, init]);

	if (!isReady) return null;

	return (
		<>
			<SalesFormAdoptionTracker
				surface="legacy"
				type={data?.order?.type === "quote" ? "quote" : "order"}
				mode={mode}
			/>
			{shouldPromptLegacyPreference ? (
				<LegacySalesFormPreferenceDialog
					type={data?.order?.type === "quote" ? "quote" : "order"}
					mode={mode}
				/>
			) : null}
			<SalesFormClient
				key={formKey}
				data={data}
				adjustmentAccess={adjustmentAccess}
				versionSwitcher={
					<SalesFormVersionSwitcher
						currentForm="legacy"
						type={data?.order?.type === "quote" ? "quote" : "order"}
						mode={mode}
						slug={data?.order?.slug}
					/>
				}
			/>
		</>
	);
}

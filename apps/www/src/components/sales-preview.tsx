"use client";

import { useSalesPreview } from "@/hooks/use-sales-preview";
import { Suspense } from "react";
import { PrintLoading } from "./print-loading";
import { PrintSalesV2 } from "./print-sales-v2";

export function SalesPreview() {
	const { params, opened } = useSalesPreview();

	if (!opened || !params.salesPreviewToken) return null;

	return (
		<div className="overflow-hidden rounded-lg border bg-background">
			<Suspense fallback={<PrintLoading />}>
				<PrintSalesV2
					token={params.salesPreviewToken}
					preview
					className="h-[80vh] min-h-[720px] w-full"
				/>
			</Suspense>
		</div>
	);
}

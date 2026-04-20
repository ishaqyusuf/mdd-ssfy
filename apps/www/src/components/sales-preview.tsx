"use client";

import { useSalesPreview } from "@/hooks/use-sales-preview";

export function SalesPreview() {
	const { params, opened } = useSalesPreview();

	if (!opened || !params.salesPreviewUrl) return null;

	return (
		<div className="overflow-hidden rounded-lg border bg-background">
			<iframe
				key={params.salesPreviewUrl}
				src={params.salesPreviewUrl}
				title="Sales preview"
				className="h-[80vh] min-h-[720px] w-full bg-white"
			/>
		</div>
	);
}

"use client";

import { SalesDocumentPreviewPage } from "@/components/sales-document-preview-page";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { useMemo } from "react";

export function SalesPreview() {
	const { params, opened } = useSalesPreview();

	const previewParams = useMemo(() => {
		if (!params.salesPreviewUrl) return null;

		try {
			const url = new URL(params.salesPreviewUrl, "https://preview.local");
			return {
				token: url.searchParams.get("token") ?? undefined,
				accessToken: url.searchParams.get("accessToken") ?? undefined,
				templateId: url.searchParams.get("templateId") ?? "template-2",
			};
		} catch {
			return null;
		}
	}, [params.salesPreviewUrl]);

	if (!opened) return null;

	if (params.salesPreviewError) {
		return (
			<div className="p-4">
				<div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
					{params.salesPreviewError}
				</div>
			</div>
		);
	}

	if (!params.salesPreviewUrl) {
		return (
			<div className="flex h-[60vh] items-center justify-center bg-background">
				<div className="text-sm text-muted-foreground">
					Preparing preview...
				</div>
			</div>
		);
	}

	if (!previewParams) {
		return (
			<div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
				Unable to load this preview.
			</div>
		);
	}

	return (
		<div className="bg-background">
			<SalesDocumentPreviewPage
				token={previewParams.token}
				accessToken={previewParams.accessToken}
				templateId={previewParams.templateId}
				embedded
			/>
		</div>
	);
}

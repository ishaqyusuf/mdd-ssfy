"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function SalesRequestGenerationSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load Sales Request AI settings"
			error={error}
			reset={reset}
		/>
	);
}

"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function DealerOrderSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load dealer order settings"
			error={error}
			reset={reset}
		/>
	);
}

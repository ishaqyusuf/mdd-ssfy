"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function SpecialOrderSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load special order settings"
			error={error}
			reset={reset}
		/>
	);
}

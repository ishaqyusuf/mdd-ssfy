"use client";

import { SalesSettingsRouteError } from "@/components/settings/sales-settings-route-error";

export default function DocumentsSettingsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<SalesSettingsRouteError
			title="Unable to load document settings"
			error={error}
			reset={reset}
		/>
	);
}

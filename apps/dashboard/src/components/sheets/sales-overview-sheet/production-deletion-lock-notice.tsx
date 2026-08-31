import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Icons } from "@gnd/ui/icons";

export function ProductionDeletionLockNotice({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<Alert
			variant="warning"
			className="rounded-md border-amber-200 bg-amber-50/70 px-3 py-2 text-amber-900 [&>svg]:left-3 [&>svg]:top-2.5 [&>svg]:size-3.5 [&>svg]:text-amber-700"
		>
			<Icons.Info />
			<AlertDescription className="translate-y-0 text-xs leading-4">
				{children}
			</AlertDescription>
		</Alert>
	);
}

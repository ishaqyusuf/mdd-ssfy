"use client";

import { SalesOverviewPageShell } from "./page-shell";
import { SalesOverviewSystemProvider } from "./provider";
import { SalesOverviewSheetShell } from "./sheet-shell";
import type { SalesOverviewSurface } from "./types";

export function SalesOverviewSystem({
	surface = "sheet",
	onSheetClose,
}: {
	surface?: SalesOverviewSurface;
	onSheetClose?: () => void;
}) {
	return (
		<SalesOverviewSystemProvider surface={surface}>
			{surface === "page" ? (
				<SalesOverviewPageShell />
			) : (
				<SalesOverviewSheetShell onClose={onSheetClose} />
			)}
		</SalesOverviewSystemProvider>
	);
}

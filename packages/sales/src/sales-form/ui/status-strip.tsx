/** @jsxImportSource react */
"use client";

import { cn } from "@gnd/ui/cn";
import { salesFormStatusClass, salesFormStatusLabel } from "./status-utils";
import type { SalesFormSaveStatus } from "./types";

export type SalesFormStatusStripProps = {
	saveStatus: SalesFormSaveStatus;
	dirty: boolean;
	lastSavedAt?: string | null;
	message?: string | null;
};

export function SalesFormStatusStrip(props: SalesFormStatusStripProps) {
	return (
		<div className="rounded-lg border p-3">
			<div
				className={cn(
					"inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
					salesFormStatusClass(props.saveStatus, props.dirty),
				)}
			>
				{salesFormStatusLabel(props.saveStatus, props.dirty)}
			</div>
			{props.lastSavedAt ? (
				<p className="mt-2 text-xs text-muted-foreground">
					Last saved: {new Date(props.lastSavedAt).toLocaleString()}
				</p>
			) : null}
			{props.message ? (
				<p className="mt-1 text-xs text-red-600">{props.message}</p>
			) : null}
		</div>
	);
}

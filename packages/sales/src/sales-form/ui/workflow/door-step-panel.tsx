"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";

export type DoorStepPanelTab = "doors" | "suppliers";

export type DoorStepPanelProps = {
	title?: string | null;
	isDoorStep?: boolean;
	hideTitle?: boolean;
	activeTab: DoorStepPanelTab;
	supplierName?: string | null;
	children: ReactNode;
	onTabChange: (tab: DoorStepPanelTab) => void;
};

export function DoorStepPanel(props: DoorStepPanelProps) {
	const shouldShowHeader = props.isDoorStep || !props.hideTitle;

	return (
		<div className="space-y-3">
			{shouldShowHeader ? (
				<div className="mb-3 flex items-center gap-2">
					{props.isDoorStep ? null : (
						<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Select Component: {props.title || "Current Step"}
						</p>
					)}
					<div className="ml-auto flex items-center gap-2">
						{props.isDoorStep ? (
							<div className="flex items-center gap-1 rounded-md border bg-muted/30 p-1">
								<Button
									type="button"
									size="sm"
									className="h-7 px-2 text-xs"
									variant={props.activeTab === "doors" ? "default" : "ghost"}
									aria-pressed={props.activeTab === "doors"}
									onClick={() => props.onTabChange("doors")}
								>
									Doors
								</Button>
								<Button
									type="button"
									size="sm"
									className="h-7 px-2 text-xs"
									variant={
										props.activeTab === "suppliers" ? "default" : "ghost"
									}
									aria-pressed={props.activeTab === "suppliers"}
									onClick={() => props.onTabChange("suppliers")}
								>
									Suppliers
								</Button>
							</div>
						) : null}
						{props.isDoorStep ? (
							<p className="text-xs text-muted-foreground">
								Supplier:{" "}
								<span className="font-semibold text-foreground">
									{props.supplierName || "GND MILLWORK"}
								</span>
							</p>
						) : null}
					</div>
				</div>
			) : null}
			{props.children}
		</div>
	);
}

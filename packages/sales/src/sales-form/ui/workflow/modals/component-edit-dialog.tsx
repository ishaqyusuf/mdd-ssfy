"use client";

import type { ReactNode } from "react";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

export type ComponentEditDialogMode = "edit" | "sectionOverride";

export type ComponentEditDialogRouteOption = {
	uid: string;
	title: string;
};

export type ComponentEditDialogState = {
	mode: ComponentEditDialogMode;
	componentTitle: string;
	salesPrice: string;
	redirectUid: string;
	overrideMode: boolean;
	noHandle: boolean;
	hasSwing: boolean;
};

export type ComponentEditDialogProps = ComponentEditDialogState & {
	open: boolean;
	imageUploadSlot?: ReactNode;
	redirectOptions: ComponentEditDialogRouteOption[];
	onOpenChange: (open: boolean) => void;
	onPatch: (patch: Partial<ComponentEditDialogState>) => void;
	onSave: () => void;
};

export function ComponentEditDialog(props: ComponentEditDialogProps) {
	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-xl overflow-hidden">
				<DialogHeader>
					<DialogTitle>
						{props.mode === "sectionOverride"
							? "Section Setting Override"
							: "Component Edit"}
					</DialogTitle>
					<DialogDescription>
						{props.mode === "sectionOverride"
							? "Configure how this component overrides the section behavior."
							: "Standard component edit form for this line step."}
					</DialogDescription>
				</DialogHeader>
				<div className="grid max-h-[calc(90vh-9rem)] gap-4 overflow-y-auto py-1 pr-1">
					<div className="grid gap-2">
						<Label>Component</Label>
						<Input value={props.componentTitle} readOnly />
					</div>
					{props.mode === "edit" ? (
						<>
							{props.imageUploadSlot ? (
								<div className="grid gap-2">{props.imageUploadSlot}</div>
							) : null}
							<div className="grid gap-2">
								<Label>Sales Cost</Label>
								<Input
									type="number"
									step="0.01"
									value={props.salesPrice}
									onChange={(e) =>
										props.onPatch({
											salesPrice: e.target.value,
										})
									}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Redirect</Label>
								<select
									className="h-10 rounded-md border border-input bg-background px-3 text-sm"
									value={props.redirectUid || ""}
									onChange={(e) =>
										props.onPatch({
											redirectUid: e.target.value,
										})
									}
								>
									<option value="">None</option>
									{props.redirectOptions.map((route) => (
										<option key={`edit-redirect-${route.uid}`} value={route.uid}>
											{route.title}
										</option>
									))}
								</select>
							</div>
						</>
					) : null}
					<div className="rounded-md border p-3">
						<div className="mb-2 flex items-center justify-between">
							<Label>Section Setting Override</Label>
							<Checkbox
								checked={props.overrideMode}
								onCheckedChange={(checked) =>
									props.onPatch({
										overrideMode: Boolean(checked),
									})
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-3">
							<div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<span>No Handle</span>
								<Checkbox
									checked={props.noHandle}
									disabled={!props.overrideMode}
									onCheckedChange={(checked) =>
										props.onPatch({
											noHandle: Boolean(checked),
										})
									}
								/>
							</div>
							<div className="flex items-center justify-between rounded border px-3 py-2 text-sm">
								<span>Has Swing</span>
								<Checkbox
									checked={props.hasSwing}
									disabled={!props.overrideMode}
									onCheckedChange={(checked) =>
										props.onPatch({
											hasSwing: Boolean(checked),
										})
									}
								/>
							</div>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => props.onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={props.onSave}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";

export type DoorSwapDialogComponent = {
	uid?: string | null;
	title?: string | null;
	img?: string | null;
	salesPrice?: number | null;
	[key: string]: unknown;
};

export type DoorSwapDialogProps<TComponent extends DoorSwapDialogComponent> = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	sourceComponent?: TComponent | null;
	candidates: TComponent[];
	onSwap: (target: TComponent) => void;
	resolveImageSrc: (src?: string | null) => string | null;
	componentLabel: (value?: string | null) => string;
	formatPrice?: (value?: number | null) => string | null;
};

export function DoorSwapDialog<TComponent extends DoorSwapDialogComponent>(
	props: DoorSwapDialogProps<TComponent>,
) {
	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => event.preventDefault()}
				className="flex h-[80dvh] max-h-[720px] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden"
			>
				<DialogHeader className="shrink-0">
					<DialogTitle>Swap Door</DialogTitle>
					<DialogDescription>
						Replace the selected door while keeping the current size and
						quantity rows.
					</DialogDescription>
				</DialogHeader>
				<div className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
					Existing rows for{" "}
					{props.componentLabel(
						props.sourceComponent?.title ||
							props.sourceComponent?.uid ||
							"current door",
					)}{" "}
					will be repriced on the selected door.
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{props.candidates.map((component) => {
							const imageSrc = props.resolveImageSrc(component.img);
							return (
								<button
									key={`swap-door-${component.uid}`}
									type="button"
									className="overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary"
									onClick={() => props.onSwap(component)}
								>
									<div className="h-32 bg-muted">
										{imageSrc ? (
											<img
												src={imageSrc}
												alt={component.title || component.uid || "Door"}
												className="h-full w-full object-contain p-2"
											/>
										) : (
											<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
												No image
											</div>
										)}
									</div>
									<div className="space-y-2 p-3">
										<p className="font-semibold">
											{props.componentLabel(
												component?.title || component?.uid || "Door",
											)}
										</p>
										{props.formatPrice?.(component?.salesPrice) ? (
											<p className="text-xs font-medium text-primary">
												{props.formatPrice(component?.salesPrice)}
											</p>
										) : null}
									</div>
								</button>
							);
						})}
						{!props.candidates.length ? (
							<div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
								No other visible door options are available to swap into right
								now.
							</div>
						) : null}
					</div>
				</div>
				<DialogFooter className="shrink-0">
					<Button variant="outline" onClick={() => props.onOpenChange(false)}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

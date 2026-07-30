"use client";

import {
	recordLegacySalesFormOnceAction,
	updateMySalesFormPreference,
} from "@/actions/update-sales-form-preference";
import type {
	SalesFormDocumentMode,
	SalesFormDocumentType,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import { useState, useTransition } from "react";

export function LegacySalesFormPreferenceDialog({
	type,
	mode,
}: {
	type: SalesFormDocumentType;
	mode: SalesFormDocumentMode;
}) {
	const [open, setOpen] = useState(true);
	const [pendingAction, setPendingAction] = useState<"persist" | "once" | null>(
		null,
	);
	const [isPending, startTransition] = useTransition();

	const run = (action: "persist" | "once") => {
		setPendingAction(action);
		startTransition(async () => {
			try {
				if (action === "persist") {
					await updateMySalesFormPreference({
						mode: "legacy",
					});
					toast({
						title: "Legacy form saved as your default",
						description:
							"Future order and quote forms will open here until you change your preference.",
						variant: "success",
					});
				} else {
					await recordLegacySalesFormOnceAction({ type, mode });
				}
				setOpen(false);
			} catch (error) {
				toast({
					title: "Unable to save your choice",
					description:
						error instanceof Error ? error.message : "Please try again.",
					variant: "destructive",
				});
			} finally {
				setPendingAction(null);
			}
		});
	};

	return (
		<Dialog open={open}>
			<DialogContent
				className="max-w-md"
				onEscapeKeyDown={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>Make the legacy sales form your default?</DialogTitle>
					<DialogDescription>
						You can keep using this form for future orders and quotes, or use it
						only for this record. Your choice helps the Super Admin monitor the
						rollout.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						disabled={isPending}
						onClick={() => run("once")}
					>
						{isPending && pendingAction === "once" ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						Only this time
					</Button>
					<Button
						type="button"
						disabled={isPending}
						onClick={() => run("persist")}
					>
						{isPending && pendingAction === "persist" ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : null}
						Keep using legacy
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

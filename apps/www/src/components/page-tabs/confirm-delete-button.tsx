"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

type ConfirmDeleteButtonProps = {
	name: string;
	disabled?: boolean;
	onConfirm: () => void;
};

export function ConfirmDeleteButton({
	name,
	disabled,
	onConfirm,
}: ConfirmDeleteButtonProps) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					aria-label={`Delete ${name}`}
					disabled={disabled}
					size="icon-sm"
					type="button"
					variant="ghost"
				>
					<Icons.Trash data-icon="only" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete tab?</AlertDialogTitle>
					<AlertDialogDescription>
						This removes {name} from the saved tabs for this page.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction variant="destructive" onClick={onConfirm}>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

"use client";

import { updateMySalesFormPreference } from "@/actions/update-sales-form-preference";
import {
	type SalesFormDocumentMode,
	type SalesFormDocumentType,
	buildSalesFormHref,
} from "@gnd/sales/sales-form";
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
import { toast } from "@gnd/ui/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
	type: SalesFormDocumentType;
	mode: SalesFormDocumentMode;
	slug?: string | null;
	currentForm: "legacy" | "new";
};

export function SalesFormVersionSwitcher({
	type,
	mode,
	slug,
	currentForm,
}: Props) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const targetForm = currentForm === "legacy" ? "new" : "legacy";
	const href = buildSalesFormHref({
		surface: targetForm,
		mode,
		type,
		slug,
		searchParams,
		queryMode: targetForm,
	});
	const label =
		targetForm === "new" ? "Use new sales form" : "Use legacy sales form";
	const icon = isPending ? (
		<Icons.Loader2 className="size-4 animate-spin" />
	) : (
		<Icons.RefreshCw className="size-4" />
	);

	const confirmSwitch = () => {
		if (targetForm === "legacy") {
			router.push(href);
			return;
		}

		startTransition(async () => {
			try {
				await updateMySalesFormPreference({
					mode: "new",
				});
				router.push(href);
			} catch (error) {
				toast({
					title: "Unable to update your sales form preference",
					description:
						error instanceof Error ? error.message : "Please try again.",
					variant: "destructive",
				});
			}
		});
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				{targetForm === "legacy" ? (
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="gap-2 border-destructive bg-secondary text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
						disabled={isPending}
					>
						{icon}
						<span>{label}</span>
					</Button>
				) : (
					<Button
						type="button"
						size="sm"
						className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
						disabled={isPending}
					>
						{icon}
						<span>{label}</span>
					</Button>
				)}
			</AlertDialogTrigger>
			<AlertDialogContent size="sm" className="gap-6 p-6 sm:max-w-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Save before switching forms</AlertDialogTitle>
					<AlertDialogDescription>
						Make sure you have saved any new or changed sale data before
						continuing. Unsaved changes do not transfer to the{" "}
						{targetForm === "legacy" ? "legacy" : "new"} sales form.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="gap-2 sm:gap-3">
					<AlertDialogCancel className="px-4" disabled={isPending}>
						Go back
					</AlertDialogCancel>
					<AlertDialogAction
						variant={targetForm === "legacy" ? "destructive" : "default"}
						className={
							targetForm === "new"
								? "bg-emerald-600 px-4 text-white hover:bg-emerald-700"
								: "px-4"
						}
						disabled={isPending}
						onClick={confirmSwitch}
					>
						{isPending ? (
							<Icons.Loader2 className="size-4 animate-spin" />
						) : null}
						Switch anyway
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

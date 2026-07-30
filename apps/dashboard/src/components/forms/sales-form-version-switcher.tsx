"use client";

import { updateMySalesFormPreference } from "@/actions/update-sales-form-preference";
import Portal from "@/components/_v1/portal";
import {
	type SalesFormDocumentMode,
	type SalesFormDocumentType,
	buildSalesFormHref,
} from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { toast } from "@gnd/ui/use-toast";
import Link from "next/link";
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

	const useNewForm = () => {
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
		<Portal nodeId="navRightSlot" noDelay>
			{targetForm === "new" ? (
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="gap-2"
					disabled={isPending}
					onClick={useNewForm}
				>
					{icon}
					<span>{label}</span>
				</Button>
			) : (
				<Button asChild size="sm" variant="outline" className="gap-2">
					<Link href={href} prefetch={false}>
						{icon}
						<span>{label}</span>
					</Link>
				</Button>
			)}
		</Portal>
	);
}

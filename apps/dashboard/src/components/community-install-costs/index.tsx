"use client";

import { CommunityInstallCostsColumnVisibility } from "@/components/tables-2/community-install-costs/column-visibility";
import { DataTable } from "@/components/tables-2/community-install-costs/data-table";
import { useCreateCommunityInstallCostRateContext } from "@/hooks/use-community-install-costs";
import { useTRPC } from "@/trpc/client";
import type { TableSettings } from "@/utils/table-settings";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SubmitButton } from "@gnd/ui/submit-button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Props = {
	initialSettings?: Partial<TableSettings>;
};

export default function CommunityInstallCostRate({ initialSettings }: Props) {
	const ctx = useCreateCommunityInstallCostRateContext();

	if (!ctx?.communityInstallCostRates?.length && ctx?.legacyCosts?.length) {
		return <LegacyImport costs={ctx.legacyCosts} />;
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-end gap-2">
				<CommunityInstallCostsColumnVisibility />
				<Button
					disabled={ctx.isLoading || !!ctx?.editIndex}
					size="sm"
					onClick={() => ctx.setEditIndex(-1)}
				>
					<Icons.Add className="h-4 w-4" />
					Add New Rate
				</Button>
			</div>
			<DataTable
				data={ctx.communityInstallCostRates}
				initialSettings={initialSettings}
				isLoading={ctx.isLoading}
				editIndex={ctx.editIndex}
				setEditIndex={ctx.setEditIndex}
			/>
		</div>
	);
}

function LegacyImport({
	costs = [],
}: {
	costs?: Array<{ title?: string; cost?: string | number }>;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { mutate: handleImport, isPending: isImporting } = useMutation(
		trpc.community.importLegacyInstallCosts.mutationOptions({
			onSuccess() {
				queryClient.invalidateQueries({
					queryKey: trpc.community.getCommunityInstallCostRates.queryKey(),
				});
			},
			meta: {
				debug: true,
				toastTitle: {
					error: "Unable to complete",
					loading: "Processing...",
					success: "Done!.",
				},
			},
		}),
	);
	return (
		<div className="flex h-full flex-col items-center justify-center p-8 text-center duration-300 animate-in zoom-in-95">
			<div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/50">
				<Icons.History size={40} className="text-muted-foreground" />
			</div>
			<h3 className="mb-2 font-bold text-2xl text-foreground">
				Import Legacy Costs
			</h3>
			<p className="mb-8 max-w-md text-muted-foreground">
				You have <strong>{costs.length}</strong> active costs in the current
				system. You can import your previous rate sheet from Version 1 to
				quickly populate your library.
			</p>

			<div className="flex w-full max-w-sm flex-col gap-3">
				<SubmitButton
					isSubmitting={isImporting}
					onClick={() => handleImport()}
					className=""
					size="lg"
				>
					<div className="flex items-center gap-4">
						<Icons.Download size={20} />
						<span>Import from Old Install Costs (v1)</span>
					</div>
				</SubmitButton>
			</div>
		</div>
	);
}

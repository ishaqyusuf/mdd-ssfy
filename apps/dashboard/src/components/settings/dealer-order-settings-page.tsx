"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterOutputs } from "@gnd/api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useState } from "react";
import { SettingsCard, SwitchRow } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

type DealerDeliveryPricing =
	RouterOutputs["sales"]["getPrintSettings"]["dealerDeliveryPricing"];

export function DealerOrderSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(trpc.sales.getPrintSettings.queryOptions());
	const canManage = settingsQuery.data?.canManage ?? false;
	const [dealerDeliveryPricing, setDealerDeliveryPricing] =
		useState<DealerDeliveryPricing | null>(null);

	useEffect(() => {
		if (settingsQuery.data?.dealerDeliveryPricing && !dealerDeliveryPricing) {
			setDealerDeliveryPricing(settingsQuery.data.dealerDeliveryPricing);
		}
	}, [dealerDeliveryPricing, settingsQuery.data?.dealerDeliveryPricing]);

	const updateDealerDeliveryPricing = useMutation(
		trpc.sales.updateDealerDeliveryPricingSettings.mutationOptions({
			async onSuccess(data) {
				setDealerDeliveryPricing(data.dealerDeliveryPricing);
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.getPrintSettings.queryKey(),
				});
				toast({
					title: "Dealer delivery pricing saved",
					description:
						"New dealer requests will show the configured office suggestion.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save dealer delivery pricing",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (settingsQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load dealer order settings"
				description="The current dealer delivery and shipping rules could not be loaded."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	if (settingsQuery.isPending || !dealerDeliveryPricing) {
		return <DealerOrderSettingsSkeleton />;
	}

	if (!canManage) {
		return (
			<div className="rounded-md border bg-background p-6">
				<div className="flex items-start gap-3">
					<Icons.AlertCircle className="mt-0.5 size-5 text-muted-foreground" />
					<div>
						<h2 className="font-semibold">Super Admin access required</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Only Super Admin users can change dealer delivery and shipping
							pricing suggestions.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<SettingsCard
			title="Dealer delivery pricing"
			description="Suggest delivery and shipping charges during office approval. Reviewers retain the final override."
		>
			<div className="space-y-5">
				<SwitchRow
					title="Enable automated suggestions"
					description="Pre-fill the review dialog from these rules without auto-approving the request."
					checked={dealerDeliveryPricing.enabled}
					onCheckedChange={(enabled) =>
						setDealerDeliveryPricing((current) =>
							current ? { ...current, enabled } : current,
						)
					}
				/>
				<div className="grid gap-4 border-t pt-5 sm:grid-cols-3">
					<div className="space-y-2">
						<Label htmlFor="dealer-delivery-base-cost">
							Delivery base cost
						</Label>
						<Input
							id="dealer-delivery-base-cost"
							type="number"
							min="0"
							step="0.01"
							value={dealerDeliveryPricing.deliveryBaseCost}
							onChange={(event) =>
								setDealerDeliveryPricing((current) =>
									current
										? {
												...current,
												deliveryBaseCost: Number(event.target.value),
											}
										: current,
								)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="dealer-ship-base-cost">Shipping base cost</Label>
						<Input
							id="dealer-ship-base-cost"
							type="number"
							min="0"
							step="0.01"
							value={dealerDeliveryPricing.shipBaseCost}
							onChange={(event) =>
								setDealerDeliveryPricing((current) =>
									current
										? {
												...current,
												shipBaseCost: Number(event.target.value),
											}
										: current,
								)
							}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="dealer-free-delivery-minimum">
							Free-delivery minimum
						</Label>
						<Input
							id="dealer-free-delivery-minimum"
							type="number"
							min="0"
							step="0.01"
							placeholder="No threshold"
							value={dealerDeliveryPricing.freeDeliveryOrderMinimum ?? ""}
							onChange={(event) =>
								setDealerDeliveryPricing((current) =>
									current
										? {
												...current,
												freeDeliveryOrderMinimum: event.target.value
													? Number(event.target.value)
													: null,
											}
										: current,
								)
							}
						/>
					</div>
				</div>
				<div className="flex justify-end">
					<Button
						variant="outline"
						disabled={updateDealerDeliveryPricing.isPending}
						onClick={() =>
							updateDealerDeliveryPricing.mutate(dealerDeliveryPricing)
						}
					>
						{updateDealerDeliveryPricing.isPending ? (
							<Icons.Loader2 className="mr-2 size-4 animate-spin" />
						) : (
							<Icons.Save className="mr-2 size-4" />
						)}
						Save delivery rules
					</Button>
				</div>
			</div>
		</SettingsCard>
	);
}

function DealerOrderSettingsSkeleton() {
	return (
		<div className="animate-pulse rounded-md border bg-background">
			<div className="space-y-2 border-b p-5">
				<div className="h-4 w-40 rounded bg-muted" />
				<div className="h-3 w-80 max-w-full rounded bg-muted" />
			</div>
			<div className="m-5 h-44 rounded bg-muted/70" />
		</div>
	);
}

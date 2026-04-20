"use client";

import { Icons } from "@gnd/ui/icons";
import { Button } from "@gnd/ui/button";
import StatusBadge from "@/components/_v1/status-badge";
import { DataSkeleton } from "@/components/data-skeleton";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { printPackingSlip } from "@/lib/quick-print";
import { formatDate } from "@/lib/use-day";
import { skeletonListData } from "@/utils/format";

import { useDispatch } from "./context";
import { Item } from "@gnd/ui/namespace";
import { DispatchListMenu } from "./dispatch-list-menu";
export function DispatchList({}) {
	const ctx = useDispatch();
	const sq = useSalesOverviewQuery();

	const previewDispatch = async (dispatchId: number) => {
		if (!ctx.data?.id) return;
		await printPackingSlip({
			salesIds: [ctx.data.id],
			dispatchId,
			v2: true,
		});
	};

	return (
		<div className="rounded-md border">
			{ctx?.data?.id && !ctx?.data?.deliveries?.length ? (
				<EmptyDelivery />
			) : (
				<Item.Group role="list" className="divide-y">
					{skeletonListData(ctx?.data?.deliveries, 2, {})?.map(
						(dispatch, index) => {
							const isCompleted =
								dispatch.status === "completed" ||
								dispatch.status === "delivered";

							return (
								<Item
									key={index}
									role="listitem"
									className="cursor-pointer"
									onClick={() =>
										sq.setParams({
											dispatchId: dispatch.id,
											salesTab: "packing",
										})
									}
								>
									{/* LEFT */}
									<Item.Content className="gap-1">
										<Item.Title className="flex items-center gap-3">
											<DataSkeleton pok="textSm">
												Dispatch #{dispatch.id}
											</DataSkeleton>

											<StatusBadge status={dispatch.status} />
										</Item.Title>

										<Item.Description className="flex flex-wrap gap-x-4 gap-y-1">
											<span>
												<DataSkeleton pok="date">
													📅 {formatDate(dispatch.dueDate) || "No due date"}
												</DataSkeleton>
											</span>

											<span>
												<DataSkeleton pok="textSm">
													👤 {dispatch?.createdBy?.name}
												</DataSkeleton>
											</span>

											<span>
												<DataSkeleton pok="textSm">
													🚚{" "}
													{dispatch.driver?.name || (
														<span className="italic text-muted-foreground">
															Not assigned
														</span>
													)}
												</DataSkeleton>
											</span>
											{dispatch.deliveredAt ? (
												<span>
													<DataSkeleton pok="date">
														✅ Completed{" "}
														{formatDate(dispatch.deliveredAt) || "Unknown date"}
													</DataSkeleton>
												</span>
											) : null}
											<span>
												<DataSkeleton pok="textSm">
													📦 {dispatch.packPercentage ?? 0}% packed
												</DataSkeleton>
											</span>
										</Item.Description>
									</Item.Content>

									{/* ACTIONS */}
									<Item.Actions
										className="self-start"
										onClick={(e) => e.stopPropagation()}
									>
										<div className="flex items-center gap-1">
											<DataSkeleton pok="date">
												<Button
													type="button"
													size="icon"
													variant="ghost"
													className="size-8"
													onClick={() => void previewDispatch(dispatch.id)}
												>
													<Icons.Printer className="size-4" />
												</Button>
											</DataSkeleton>
											{!isCompleted ? (
												<DataSkeleton pok="date">
													<DispatchListMenu dispatch={dispatch} />
												</DataSkeleton>
											) : null}
										</div>
									</Item.Actions>
								</Item>
							);
						},
					)}
				</Item.Group>
			)}
		</div>
	);
}
function EmptyDelivery() {
	return (
		<div className="flex h-36 items-center justify-center">
			<div className="flex flex-col items-center">
				<Icons.delivery className="mb-4" />
				<div className="mb-6 space-y-2 text-center">
					<h2 className="text-lg font-medium">No Delivery</h2>
					<p className="text-sm text-[#606060]">
						{"There are no assignments on this item"}
					</p>
				</div>
			</div>
		</div>
	);
}

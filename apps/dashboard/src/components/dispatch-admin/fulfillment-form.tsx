"use client";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";
import { useFulfillmentParams } from "@/hooks/use-fulfillment-params";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@gnd/ui/select";
import {
	Item,
	ItemGroup,
	ItemContent,
	ItemTitle,
	ItemDescription,
	ItemActions,
} from "@gnd/ui/item";
import { SalesFormQuantityStepper } from "@sales/sales-form";
import { DeliveryDatePicker } from "./create-dispatch/delivery-date-picker";
import { Switch } from "@gnd/ui/switch";
import { toast } from "@gnd/ui/use-toast";

type Options = RouterOutputs["dispatch"]["fulfillmentAssignmentOptions"];
export function FulfillmentForm({
	options,
	edit,
}: {
	options: Options;
	edit?: {
		fulfillmentId: number;
		driverId: number | null;
		selectionMode: "selected" | "all_remaining";
		lines: Options["lines"];
	};
}) {
	const formId = useId();
	const trpc = useTRPC();
	const cache = useQueryClient();
	const navigation = useFulfillmentParams();
	const drivers = useQuery(trpc.hrm.getDrivers.queryOptions({}));
	const [driverId, setDriverId] = useState(
		edit?.driverId ? String(edit.driverId) : "",
	);
	const [dueDate, setDueDate] = useState(
		options.dueDate ? new Date(options.dueDate).toISOString().slice(0, 10) : "",
	);
	const [selected, setSelected] = useState(edit?.selectionMode === "selected");
	const [lines, setLines] = useState(
		options.lines.map((line) => ({
			...line,
			selected: edit
				? edit.lines.some(
						(saved) =>
							saved.uid === line.uid &&
							saved.quantity.qty + saved.quantity.lh + saved.quantity.rh > 0,
					)
				: true,
			quantity: {
				...(edit?.lines.find((saved) => saved.uid === line.uid)?.quantity ??
					line.quantity),
			},
		})),
	);
	const request = useRef<{ payload: string; id: string } | null>(null);
	const onSuccess = async (result: {
		fulfillmentId: number;
		notificationFailed: boolean;
	}) => {
		await cache.invalidateQueries({ queryKey: trpc.dispatch.pathKey() });
		toast({
			title: result.notificationFailed
				? "Fulfillment saved; driver notification failed"
				: edit
					? "Fulfillment updated"
					: "Fulfillment assigned",
		});
		void navigation.openFulfillment(result.fulfillmentId);
	};
	const createMutation = useMutation(
		trpc.dispatch.createFulfillment.mutationOptions({ onSuccess }),
	);
	const updateMutation = useMutation(
		trpc.dispatch.updateFulfillment.mutationOptions({ onSuccess }),
	);
	const mutation = edit ? updateMutation : createMutation;
	const chosen = selected
		? lines.filter((line) => line.selected)
		: options.lines;
	const count = chosen.reduce(
		(sum, line) =>
			sum + line.quantity.qty + line.quantity.lh + line.quantity.rh,
		0,
	);
	const valid =
		count > 0 &&
		chosen.every((line) => {
			const available = options.lines.find(
				(item) => item.uid === line.uid,
			)!.quantity;
			return (
				["qty", "lh", "rh"].every((key) => {
					const axis = key as "qty" | "lh" | "rh";
					return (
						Number.isSafeInteger(line.quantity[axis]) &&
						line.quantity[axis] >= 0 &&
						line.quantity[axis] <= available[axis]
					);
				}) && line.quantity.qty + line.quantity.lh + line.quantity.rh > 0
			);
		});
	return (
		<Sheet.SecondaryContent
			Footer={
				<Sheet.SecondaryFooter className="bg-background">
					<Button
						type="button"
						variant="outline"
						disabled={mutation.isPending}
						onClick={() =>
							edit
								? navigation.openFulfillment(edit.fulfillmentId)
								: navigation.closeFulfillment()
						}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form={formId}
						disabled={!options.canAssign || !valid || mutation.isPending}
					>
						{mutation.isPending
							? "Saving…"
							: edit
								? "Save fulfillment"
								: "Assign fulfillment"}
					</Button>
				</Sheet.SecondaryFooter>
			}
		>
			<form
				id={formId}
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					if (!valid || mutation.isPending) return;
					const payload = {
						salesId: options.salesId,
						expectedRevision: options.revision,
						driverId: driverId ? Number(driverId) : null,
						dueDate: dueDate || null,
						deliveryMode: options.deliveryMode,
						selectionMode: selected
							? ("selected" as const)
							: ("all_remaining" as const),
						lines: selected
							? chosen.map(({ uid, quantity }) => ({ uid, quantity }))
							: [],
					};
					const serialized = JSON.stringify(payload);
					if (request.current?.payload !== serialized)
						request.current = { payload: serialized, id: crypto.randomUUID() };
					if (edit)
						updateMutation.mutate({
							...payload,
							requestId: request.current.id,
							fulfillmentId: edit.fulfillmentId,
						});
					else
						createMutation.mutate({
							...payload,
							requestId: request.current.id,
						});
				}}
			>
				<Sheet.Header>
					<Sheet.Title>
						{edit ? "Edit fulfillment" : "Assign fulfillment"}
					</Sheet.Title>
					<Sheet.Description>Order {options.orderNo}</Sheet.Description>
				</Sheet.Header>
				<fieldset
					disabled={mutation.isPending || !options.canAssign}
					className="space-y-5"
				>
					{options.deliveryMode !== "pickup" && (
						<label className="grid gap-2 text-sm">
							Driver
							<Select
								value={driverId || "unassigned"}
								onValueChange={(value) =>
									setDriverId(value === "unassigned" ? "" : value)
								}
								disabled={mutation.isPending || !options.canAssign}
							>
								<SelectTrigger aria-label="Driver">
									<SelectValue placeholder="Select driver" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="unassigned">Unassigned</SelectItem>
									{drivers.data?.map((driver) => (
										<SelectItem key={driver.id} value={String(driver.id)}>
											{driver.name || driver.email}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</label>
					)}
					{drivers.isError && (
						<p role="alert" className="text-sm">
							Drivers could not be loaded.{" "}
							<Button
								type="button"
								variant="link"
								onClick={() => drivers.refetch()}
							>
								Retry
							</Button>
						</p>
					)}
					<div className="grid gap-2 text-sm">
						<span>Fulfillment date</span>
						<DeliveryDatePicker
							label="Fulfillment date"
							value={dueDate || null}
							onChange={(value) => setDueDate(value || "")}
							allowClear
							placeholder="Unscheduled"
						/>
					</div>
					<div className="flex items-start justify-between gap-4 border-y py-4">
						<div>
							<label htmlFor="partial-fulfillment" className="font-medium">
								Partial Fulfillment
							</label>
							<p className="mt-1 text-sm text-muted-foreground">
								Select part of the remaining order for this fulfillment.
							</p>
						</div>
						<Switch
							id="partial-fulfillment"
							checked={selected}
							onCheckedChange={setSelected}
						/>
					</div>
					{selected && (
						<ItemGroup className="rounded-md border divide-y">
							{lines.map((line) => {
								const available = options.lines.find(
									(item) => item.uid === line.uid,
								)!.quantity;
								return (
									<Item key={line.uid} className="flex-wrap gap-3 p-3">
										<Checkbox
											aria-label={`Include ${line.title} ${line.size || ""}`}
											checked={line.selected}
											disabled={mutation.isPending || !options.canAssign}
											onCheckedChange={(checked) =>
												setLines((items) =>
													items.map((item) =>
														item.uid === line.uid
															? { ...item, selected: checked === true }
															: item,
													),
												)
											}
										/>
										<ItemContent>
											<ItemTitle>{line.title}</ItemTitle>
											<ItemDescription>{line.size}</ItemDescription>
										</ItemContent>
										<ItemActions className="basis-full sm:basis-auto">
											<div
												className={`grid w-full gap-2 ${available.qty > 0 ? "grid-cols-1 sm:w-32" : "grid-cols-2 sm:w-72"}`}
											>
												{(available.qty > 0
													? (["qty"] as const)
													: (["lh", "rh"] as const)
												).map((axis) => (
													<div key={axis} className="space-y-1">
														<p className="text-xs font-medium uppercase text-muted-foreground">
															{axis === "qty" ? "Quantity" : axis}
														</p>
														<SalesFormQuantityStepper
															label={`${axis.toUpperCase()} quantity for ${line.title}`}
															value={line.quantity[axis]}
															min={0}
															max={available[axis]}
															disabled={
																!line.selected ||
																mutation.isPending ||
																!options.canAssign
															}
															className="w-full"
															onChange={(value) =>
																setLines((items) =>
																	items.map((item) =>
																		item.uid === line.uid
																			? {
																					...item,
																					quantity: {
																						...item.quantity,
																						[axis]: value,
																					},
																				}
																			: item,
																	),
																)
															}
														/>
													</div>
												))}
											</div>
										</ItemActions>
									</Item>
								);
							})}
						</ItemGroup>
					)}
					<div className="grid grid-cols-2 gap-3 text-sm">
						<p>{count} units selected</p>
						<p>{options.availableQty - count} units backlog after assignment</p>
					</div>
				</fieldset>
				{options.blockedReason && (
					<p role="alert" className="text-sm">
						{options.blockedReason}
					</p>
				)}
				{mutation.isError && (
					<p role="alert" className="text-sm text-destructive">
						{mutation.error?.message}
					</p>
				)}
			</form>
		</Sheet.SecondaryContent>
	);
}

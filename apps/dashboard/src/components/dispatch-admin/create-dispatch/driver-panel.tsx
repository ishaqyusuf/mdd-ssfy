"use client";

import { Badge } from "@gnd/ui/badge";
import { CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { cn } from "@gnd/ui/cn";
import { FieldLegend, FieldSet } from "@gnd/ui/field";
import { RadioGroup, RadioGroupItem } from "@gnd/ui/radio-group";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Skeleton } from "@gnd/ui/skeleton";
import type { DriverChoice } from "./types";

export function DispatchDriverPanel({
	drivers,
	selectedDriverId,
	onDriverChange,
	isLoading,
	disabled,
}: {
	drivers: DriverChoice[];
	selectedDriverId: number | null;
	onDriverChange: (driverId: number | null) => void;
	isLoading: boolean;
	disabled: boolean;
}) {
	const recommendedDriverId = disabled ? null : (drivers[0]?.id ?? null);

	return (
		<section className="flex min-h-[28rem] min-w-0 flex-col lg:min-h-0">
			<CardHeader className="p-4">
				<CardTitle className="mb-0 text-base">Driver</CardTitle>
			</CardHeader>
			<ScrollArea className="min-h-0 flex-1 border-t">
				<CardContent className={cn("p-4", disabled && "opacity-50")}>
					<FieldSet disabled={disabled}>
						<FieldLegend className="sr-only">Driver assignment</FieldLegend>
						<RadioGroup
							value={
								disabled
									? "unassigned"
									: selectedDriverId
										? String(selectedDriverId)
										: "unassigned"
							}
							disabled={disabled}
							onValueChange={(value) =>
								onDriverChange(value === "unassigned" ? null : Number(value))
							}
							className="gap-3"
						>
							<label
								htmlFor="dispatch-driver-unassigned"
								className="flex cursor-pointer items-center gap-3 border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted"
							>
								<RadioGroupItem
									id="dispatch-driver-unassigned"
									value="unassigned"
								/>
								<p className="text-sm font-medium">Unassigned</p>
							</label>
							{isLoading ? (
								<div
									className="flex flex-col gap-3"
									aria-label="Loading drivers"
								>
									<Skeleton className="h-24 w-full" />
									<Skeleton className="h-24 w-full" />
								</div>
							) : null}
							{drivers.map((driver) => (
								<label
									key={driver.id}
									htmlFor={`dispatch-driver-${driver.id}`}
									className="flex cursor-pointer items-start gap-3 border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted [content-visibility:auto]"
								>
									<RadioGroupItem
										id={`dispatch-driver-${driver.id}`}
										value={String(driver.id)}
									/>
									<div className="min-w-0 flex-1">
										<div className="flex items-start justify-between gap-2 lg:flex-col">
											<p className="truncate text-sm font-medium">
												{driver.name}
											</p>
											{driver.id === recommendedDriverId ? (
												<Badge
													variant="secondary"
													className="shrink-0 lg:self-start"
												>
													Lightest load
												</Badge>
											) : null}
										</div>
										<div className="mt-3 grid grid-cols-3 gap-2 text-xs lg:grid-cols-1 lg:gap-1">
											<div className="lg:flex lg:items-center lg:justify-between lg:gap-2">
												<p className="text-muted-foreground">Active</p>
												<p className="font-medium">{driver.active}</p>
											</div>
											<div className="lg:flex lg:items-center lg:justify-between lg:gap-2">
												<p className="text-muted-foreground">In transit</p>
												<p className="font-medium">{driver.inTransit}</p>
											</div>
											<div className="lg:flex lg:items-center lg:justify-between lg:gap-2">
												<p className="text-muted-foreground">Exceptions</p>
												<p className="font-medium">{driver.openExceptions}</p>
											</div>
										</div>
									</div>
								</label>
							))}
						</RadioGroup>
					</FieldSet>
				</CardContent>
			</ScrollArea>
		</section>
	);
}

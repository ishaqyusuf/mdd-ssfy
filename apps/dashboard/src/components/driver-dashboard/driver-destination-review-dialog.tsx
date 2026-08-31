"use client";

import AddressAutoComplete, {
	type AddressType,
} from "@/components/address-autocomplete";
import { useDriverDispatchActions } from "@/hooks/use-driver-dispatch-actions";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Spinner } from "@gnd/ui/spinner";
import { AlertTriangle, CheckCircle2, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type DestinationReviewStop = {
	dispatchId: number;
	orderNo: string;
	customer: string;
	primaryAddress: string;
};

export function DriverDestinationReviewDialog({
	open,
	stops,
	onOpenChange,
	onComplete,
}: {
	open: boolean;
	stops: readonly DestinationReviewStop[];
	onOpenChange: (open: boolean) => void;
	onComplete: () => void;
}) {
	const actions = useDriverDispatchActions();
	const [index, setIndex] = useState(0);
	const [search, setSearch] = useState("");
	const [address, setAddress] = useState<AddressType | null>(null);
	const [error, setError] = useState<string | null>(null);
	const stop = stops[index];

	const resetSelection = useCallback(() => {
		setSearch("");
		setAddress(null);
		setError(null);
	}, []);

	useEffect(() => {
		if (!open) return;
		setIndex(0);
		resetSelection();
	}, [open, resetSelection]);

	const save = async () => {
		if (!stop || !address?.placeId) {
			setError("Choose a verified address from the Google suggestions.");
			return;
		}
		setError(null);
		try {
			await actions.normalizeDestination.mutateAsync({
				dispatchId: stop.dispatchId,
				placeId: address.placeId,
			});
			if (index < stops.length - 1) {
				setIndex((current) => current + 1);
				resetSelection();
				return;
			}
			onComplete();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The address could not be verified.",
			);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) =>
				!actions.normalizeDestination.isPending && onOpenChange(next)
			}
		>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Confirm the route destination</DialogTitle>
					<DialogDescription>
						Google needs a verified map location before this route starts. The
						customer&apos;s original address stays unchanged.
					</DialogDescription>
				</DialogHeader>

				{stop ? (
					<div className="grid gap-4">
						<Alert>
							<MapPin />
							<AlertTitle>
								{stop.customer} · Order {stop.orderNo}
							</AlertTitle>
							<AlertDescription>
								Original address:{" "}
								{stop.primaryAddress || "No delivery address entered"}
							</AlertDescription>
						</Alert>

						<FieldGroup>
							<Field>
								<FieldLabel>Search Google Maps</FieldLabel>
								<AddressAutoComplete
									address={address || undefined}
									setAddress={(value) => setAddress(value)}
									searchInput={search}
									setSearchInput={setSearch}
									dialogTitle="Confirm route destination"
									placeholder="Search street address"
								/>
								<FieldDescription>
									This verified location is saved only as the dispatch routing
									address. If it differs, drivers see both addresses.
								</FieldDescription>
							</Field>
						</FieldGroup>

						{error ? (
							<Alert variant="destructive">
								<AlertTriangle />
								<AlertTitle>Address not saved</AlertTitle>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}
					</div>
				) : (
					<Alert>
						<CheckCircle2 />
						<AlertTitle>Destinations are ready</AlertTitle>
					</Alert>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={actions.normalizeDestination.isPending}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						disabled={!stop || actions.normalizeDestination.isPending}
						onClick={() => void save()}
					>
						{actions.normalizeDestination.isPending ? (
							<Spinner />
						) : (
							<MapPin data-icon="inline-start" />
						)}
						{index < stops.length - 1
							? `Save & review next (${index + 1}/${stops.length})`
							: "Save destination"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

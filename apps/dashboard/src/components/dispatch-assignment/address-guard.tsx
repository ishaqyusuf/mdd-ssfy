"use client";

import AddressAutoComplete, {
	type AddressType,
} from "@/components/address-autocomplete";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AssignmentScope =
	RouterInputs["dispatch"]["assignmentDestinationPreflight"];
type AssignmentTarget =
	RouterOutputs["dispatch"]["assignmentDestinationPreflight"]["missing"][number];

function AssignmentAddressDialog({
	open,
	targets,
	onCancel,
	onComplete,
}: {
	open: boolean;
	targets: readonly AssignmentTarget[];
	onCancel: () => void;
	onComplete: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [index, setIndex] = useState(0);
	const [search, setSearch] = useState("");
	const [address, setAddress] = useState<AddressType | null>(null);
	const [error, setError] = useState<string | null>(null);
	const target = targets[index];
	const normalize = useMutation(
		trpc.dispatch.normalizeAssignmentDestination.mutationOptions(),
	);

	const resetSelection = () => {
		setSearch("");
		setAddress(null);
		setError(null);
	};

	useEffect(() => {
		if (!open) return;
		setIndex(0);
		setSearch("");
		setAddress(null);
		setError(null);
	}, [open]);

	const save = async () => {
		if (!target || !address?.placeId) {
			setError("Choose a verified address from the Google suggestions.");
			return;
		}
		setError(null);
		try {
			await normalize.mutateAsync({
				salesId: target.salesId,
				placeId: address.placeId,
			});
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.backlog.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				}),
			]);
			if (index < targets.length - 1) {
				setIndex((current) => current + 1);
				resetSelection();
				return;
			}
			setIndex(0);
			resetSelection();
			onComplete();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The order address could not be verified.",
			);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next && !normalize.isPending) {
					setIndex(0);
					resetSelection();
					onCancel();
				}
			}}
		>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Verify delivery address before assigning</DialogTitle>
					<DialogDescription>
						A driver can only be assigned after every delivery order has a
						Google-verified map location.
					</DialogDescription>
				</DialogHeader>

				{target ? (
					<div className="grid gap-4">
						<Alert>
							<MapPin />
							<AlertTitle>
								{target.customerName.toUpperCase()} · Order {target.orderNo}
							</AlertTitle>
							<AlertDescription>
								Current order address: {target.primaryAddress || "Not entered"}
							</AlertDescription>
						</Alert>

						<FieldGroup>
							<Field>
								<FieldLabel>Search the correct delivery address</FieldLabel>
								<AddressAutoComplete
									address={address || undefined}
									setAddress={setAddress}
									searchInput={search}
									setSearchInput={setSearch}
									dialogTitle="Verify delivery address"
									placeholder="Search street address"
								/>
								<FieldDescription>
									This updates the shipping address for this order only. The
									customer&apos;s master address remains unchanged.
								</FieldDescription>
							</Field>
						</FieldGroup>

						{error ? (
							<Alert variant="destructive">
								<AlertTriangle />
								<AlertTitle>Address not verified</AlertTitle>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}
					</div>
				) : null}

				<DialogFooter>
					<div className="mr-auto text-xs text-muted-foreground">
						Address {Math.min(index + 1, targets.length)} of {targets.length}
					</div>
					<Button
						type="button"
						variant="outline"
						disabled={normalize.isPending}
						onClick={() => {
							setIndex(0);
							resetSelection();
							onCancel();
						}}
					>
						Cancel assignment
					</Button>
					<Button
						type="button"
						disabled={!address?.placeId || normalize.isPending}
						onClick={() => void save()}
					>
						{normalize.isPending ? <Spinner /> : null}
						{index < targets.length - 1
							? "Save and review next"
							: "Save and continue assignment"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function useDispatchAssignmentAddressGuard() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [targets, setTargets] = useState<AssignmentTarget[]>([]);
	const [open, setOpen] = useState(false);
	const [isChecking, setIsChecking] = useState(false);
	const resumeRef = useRef<(() => void) | null>(null);

	const cancel = useCallback(() => {
		resumeRef.current = null;
		setTargets([]);
		setOpen(false);
	}, []);

	const guardAssignment = useCallback(
		async (scope: AssignmentScope, onReady: () => void) => {
			setIsChecking(true);
			try {
				const result = await queryClient.fetchQuery(
					trpc.dispatch.assignmentDestinationPreflight.queryOptions(scope),
				);
				if (!result.missing.length) {
					onReady();
					return;
				}
				resumeRef.current = onReady;
				setTargets(result.missing);
				setOpen(true);
			} catch (cause) {
				toast.error(
					cause instanceof Error
						? cause.message
						: "Unable to verify the delivery address.",
				);
			} finally {
				setIsChecking(false);
			}
		},
		[queryClient, trpc.dispatch.assignmentDestinationPreflight],
	);

	const complete = useCallback(() => {
		const resume = resumeRef.current;
		resumeRef.current = null;
		setTargets([]);
		setOpen(false);
		resume?.();
	}, []);

	return {
		guardAssignment,
		isChecking,
		dialog: (
			<AssignmentAddressDialog
				open={open}
				targets={targets}
				onCancel={cancel}
				onComplete={complete}
			/>
		),
	};
}

"use client";

import { OpenJobSheet } from "@/components/open-contractor-jobs-sheet";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { useSession } from "next-auth/react";
import type { ComponentProps } from "react";

function getFallbackInsuranceStatus(): InsuranceRequirement {
	return {
		blocking: true,
		expiresAt: null,
		message: "Upload your insurance document before submitting a new job.",
		state: "missing",
	};
}

type Props = Omit<ComponentProps<typeof OpenJobSheet>, "disabled">;

export function GuardedOpenJobSheet(props: Props) {
	const trpc = useTRPC();
	const { status } = useSession();
	const enabled = status === "authenticated";
	const { data: profile } = useQuery(
		trpc.user.getProfile.queryOptions(undefined, {
			enabled,
		}),
	);

	const insuranceStatus = profile?.documents?.length
		? getInsuranceRequirement(profile.documents)
		: getFallbackInsuranceStatus();

	return (
		<OpenJobSheet
			{...props}
			disabled={insuranceStatus.blocking}
			disabledReason={insuranceStatus.message}
		/>
	);
}

"use client";

import { OpenJobSheet } from "@/components/open-contractor-jobs-sheet";
import { useAuth } from "@/hooks/use-auth";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import {
	type InsuranceRequirement,
	getInsuranceRequirement,
} from "@gnd/utils/insurance-documents";
import { useSession } from "next-auth/react";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof OpenJobSheet>, "disabled">;

export function useGuardedOpenJobState() {
	const trpc = useTRPC();
	const auth = useAuth();
	const { status } = useSession();
	const enabled = status === "authenticated";
	const { data: profile, isPending, isFetching } = useQuery(
		trpc.user.getProfile.queryOptions(undefined, {
			enabled,
			refetchOnMount: "always",
			refetchOnWindowFocus: true,
		}),
	);
	const canBypassInsuranceBlock = Boolean(auth.can?.submitCustomJob);
	const isCheckingInsurance = enabled && !profile && (isPending || isFetching);
	const insuranceStatus: InsuranceRequirement | null = profile
		? getInsuranceRequirement(profile.documents ?? [])
		: null;

	if (canBypassInsuranceBlock) {
		return {
			disabled: false,
			disabledReason: undefined,
			isCheckingInsurance,
			insuranceStatus,
		};
	}

	if (isCheckingInsurance) {
		return {
			disabled: false,
			disabledReason: undefined,
			isCheckingInsurance: true,
			insuranceStatus: null,
		};
	}

	return {
		disabled: insuranceStatus?.blocking ?? false,
		disabledReason: insuranceStatus?.message,
		isCheckingInsurance: false,
		insuranceStatus,
	};
}

export function GuardedOpenJobSheet(props: Props) {
	const state = useGuardedOpenJobState();
	return (
		<OpenJobSheet
			{...props}
			disabled={state.disabled}
			disabledReason={state.disabledReason}
		/>
	);
}

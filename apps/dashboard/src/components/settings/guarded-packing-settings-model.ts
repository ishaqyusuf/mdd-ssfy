import type {
    GuardedPackingPolicy,
    GuardedPackingPolicyInput,
} from "@gnd/settings";

export function guardedPackingPolicyToInput(
    policy: GuardedPackingPolicy,
): GuardedPackingPolicyInput {
    return {
        enabled: policy.enabled,
        allowAwaitingProductionSubmission:
            policy.allowAwaitingProductionSubmission,
        allowPendingMaterialReview: policy.allowPendingMaterialReview,
        reviewMode: policy.reviewMode,
        notifySalesRep: policy.notifySalesRep,
        createProductionEvidenceOnApproval:
            policy.createProductionEvidenceOnApproval,
    };
}

export function isGuardedPackingPolicyDraftChanged(
    draft: GuardedPackingPolicyInput,
    persisted: GuardedPackingPolicy,
) {
    const current = guardedPackingPolicyToInput(persisted);
    return (
        Object.keys(current) as Array<keyof GuardedPackingPolicyInput>
    ).some((key) => current[key] !== draft[key]);
}

import type { MobileAccessRequestStatus } from "@api/schemas/mobile-access";

const allowedTransitions: Record<
	MobileAccessRequestStatus,
	readonly MobileAccessRequestStatus[]
> = {
	REQUESTED: ["APPROVED", "REJECTED", "CANCELLED"],
	APPROVED: ["INVITED", "REJECTED", "CANCELLED"],
	INVITED: ["ACCEPTED", "CANCELLED"],
	ACCEPTED: ["INSTALLED", "CANCELLED"],
	INSTALLED: [],
	REJECTED: ["REQUESTED"],
	CANCELLED: ["REQUESTED"],
};

export function canTransitionMobileAccessRequest(
	from: MobileAccessRequestStatus,
	to: MobileAccessRequestStatus,
) {
	return allowedTransitions[from].includes(to);
}

export function nextMobileAccessStatuses(status: MobileAccessRequestStatus) {
	return allowedTransitions[status];
}

export function mobileAccessStatusTimestamp(
	status: MobileAccessRequestStatus,
	now: Date,
) {
	switch (status) {
		case "APPROVED":
			return { approvedAt: now };
		case "INVITED":
			return { invitedAt: now };
		case "ACCEPTED":
			return { acceptedAt: now };
		case "INSTALLED":
			return { installedAt: now };
		case "REJECTED":
			return { rejectedAt: now };
		case "CANCELLED":
			return { cancelledAt: now };
		default:
			return {};
	}
}

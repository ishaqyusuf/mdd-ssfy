import { createHash } from "node:crypto";
import type {
	MailboxProvider,
	SalesRequestMailboxPolicy,
} from "@gnd/sales-request-mailbox";
import type { TransactionClient } from "../index";
import type {
	ResolveSalesRequestMailboxPersistenceAuthority,
	SalesRequestMailboxPersistenceAuthority,
} from "./sales-request-mailbox-lifecycle";

type PolicyResult = {
	settingId: number;
	source: "default" | "invalid" | "persisted";
	policy: SalesRequestMailboxPolicy;
};

export type ReadSalesRequestMailboxPolicy = (
	db: Pick<TransactionClient, "settings">,
	settingId: number,
) => Promise<PolicyResult>;

function digest(prefix: "mbo1" | "mba1", value: unknown) {
	return `${prefix}:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function providerEligible(
	policy: SalesRequestMailboxPolicy,
	provider: MailboxProvider,
	userId: number,
) {
	return (
		policy.enabled &&
		!policy.emergencyDisabled &&
		policy.supportedProviders.includes(provider) &&
		policy.eligibleUserIds.includes(userId)
	);
}

export function createSalesRequestMailboxAuthorityResolvers(dependencies: {
	readPolicy: ReadSalesRequestMailboxPolicy;
}) {
	const resolvePersistenceAuthority: ResolveSalesRequestMailboxPersistenceAuthority =
		async (tx, input) => {
			const user = await tx.users.findFirst({
				where: {
					id: input.actorUserId,
					type: "EMPLOYEE",
					deletedAt: null,
					accessRevokedAt: null,
				},
				select: {
					id: true,
					employeeProfileId: true,
					employeeProfile: {
						select: { id: true, deletedAt: true },
					},
					roles: {
						where: {
							deletedAt: null,
							role: { deletedAt: null },
							organization: { deletedAt: null },
						},
						orderBy: [
							{ organization: { primary: "desc" as const } },
							{ organizationId: "asc" as const },
							{ roleId: "asc" as const },
						],
						take: 1,
						select: {
							roleId: true,
							organizationId: true,
						},
					},
				},
			});
			if (!user) return { kind: "rejected", reason: "employee-inactive" };
			if (
				!user.employeeProfileId ||
				!user.employeeProfile ||
				user.employeeProfile.deletedAt
			) {
				return { kind: "rejected", reason: "profile-inactive" };
			}
			const office = user.roles[0];
			if (!office) return { kind: "rejected", reason: "office-unavailable" };

			const settings = await tx.settings.findMany({
				where: { type: "sales-settings", deletedAt: null },
				select: { id: true },
				orderBy: [{ id: "asc" }],
				take: 2,
			});
			const setting = settings[0];
			if (!setting || settings.length !== 1) {
				return { kind: "rejected", reason: "settings-unavailable" };
			}
			const policyResult = await dependencies.readPolicy(tx, setting.id);
			if (
				policyResult.source !== "persisted" ||
				policyResult.settingId !== setting.id
			) {
				return { kind: "rejected", reason: "settings-unavailable" };
			}

			const officeAuthorityFacts = {
				ownerUserId: user.id,
				employeeProfileId: user.employeeProfile.id,
				organizationId: office.organizationId,
				roleId: office.roleId,
			};
			const officeAuthorityKey = digest("mbo1", officeAuthorityFacts);
			const authorityRevision = digest("mba1", {
				...officeAuthorityFacts,
				salesSettingsId: setting.id,
				policyRevision: policyResult.policy.revision,
				policy: policyResult.policy,
			});
			const authority: SalesRequestMailboxPersistenceAuthority = {
				ownerUserId: user.id,
				employeeProfileId: user.employeeProfile.id,
				organizationId: office.organizationId,
				officeAuthorityKey,
				authorityRevision,
				salesSettingsId: setting.id,
				salesSettingsRevision: policyResult.policy.revision,
				policyRevision: policyResult.policy.revision,
				policy: policyResult.policy,
				providerEligible: providerEligible(
					policyResult.policy,
					input.provider,
					user.id,
				),
			};
			return { kind: "authorized", authority };
		};

	const resolveContentAuthority = async (
		tx: TransactionClient,
		connection: {
			provider: string;
			ownerUserId: number;
			organizationId: number;
			employeeProfileId: number;
			officeAuthorityKey: string;
			authorityRevision: string;
			salesSettingsId: number;
			salesSettingsRevision: number;
			policyRevision: number;
		},
	) => {
		if (
			connection.provider !== "gmail" &&
			connection.provider !== "microsoft-graph"
		) {
			return { current: false, ownerActive: false, policy: null };
		}
		const resolved = await resolvePersistenceAuthority(tx, {
			actorUserId: connection.ownerUserId,
			provider: connection.provider,
			now: new Date(),
			purpose: "token-health",
		});
		if (resolved.kind !== "authorized") {
			return { current: false, ownerActive: false, policy: null };
		}
		const current = resolved.authority;
		return {
			current:
				current.ownerUserId === connection.ownerUserId &&
				current.organizationId === connection.organizationId &&
				current.employeeProfileId === connection.employeeProfileId &&
				current.officeAuthorityKey === connection.officeAuthorityKey &&
				current.authorityRevision === connection.authorityRevision &&
				current.salesSettingsId === connection.salesSettingsId &&
				current.salesSettingsRevision === connection.salesSettingsRevision &&
				current.policyRevision === connection.policyRevision &&
				current.providerEligible,
			ownerActive: true,
			policy: current.policy,
		};
	};

	return { resolvePersistenceAuthority, resolveContentAuthority };
}

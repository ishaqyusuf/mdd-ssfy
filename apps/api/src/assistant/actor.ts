import {
	getUserSpecificPermissions,
	mergePermissionRecords,
} from "@gnd/auth/utils";
import type { Database } from "@gnd/db";
import { generatePermissions } from "@gnd/utils/constants";

export type AssistantActor = {
	userId: number;
	scopeType: "organization" | "user";
	scopeId: string;
	locale: string;
	timezone: string;
	grants: Record<string, boolean>;
	fullName: string | null;
	teamName: string | null;
	baseCurrency: string;
	dateFormat: string | null;
	timeFormat: 12 | 24;
	countryCode: string | null;
};

export function hasAssistantAccess(grants: Record<string, boolean>) {
	return Boolean(grants.viewOrders || grants.editOrders || grants.viewSales);
}

export async function resolveAssistantActor(
	db: Database,
	userId: number,
): Promise<AssistantActor | null> {
	const [profile, specificPermissions] = await Promise.all([
		db.users.findFirst({
			where: { id: userId, deletedAt: null, accessRevokedAt: null },
			select: {
				name: true,
				meta: true,
				roles: {
					where: {
						deletedAt: null,
						organization: { deletedAt: null },
						role: { deletedAt: null },
					},
					orderBy: [
						{ organization: { primary: "desc" as const } },
						{ organizationId: "asc" as const },
					],
					take: 1,
					select: {
						organizationId: true,
						organization: { select: { name: true } },
						role: {
							select: {
								name: true,
								RoleHasPermissions: {
									where: {
										deletedAt: null,
										permission: { deletedAt: null },
									},
									select: { permission: { select: { name: true } } },
								},
							},
						},
					},
				},
			},
		}),
		getUserSpecificPermissions(db, userId),
	]);
	if (!profile) return null;

	const meta =
		profile.meta &&
		typeof profile.meta === "object" &&
		!Array.isArray(profile.meta)
			? (profile.meta as Record<string, unknown>)
			: {};
	let timezone = typeof meta.timezone === "string" ? meta.timezone : "UTC";
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
	} catch {
		timezone = "UTC";
	}
	let locale = typeof meta.locale === "string" ? meta.locale : "en-US";
	try {
		new Intl.DateTimeFormat(locale).format();
	} catch {
		locale = "en-US";
	}
	const currency =
		typeof meta.baseCurrency === "string"
			? meta.baseCurrency.toUpperCase()
			: "USD";
	const organizationId = profile.roles[0]?.organizationId;
	const role = profile.roles[0]?.role;
	const rolePermissions =
		role?.RoleHasPermissions.flatMap(({ permission }) => permission) ?? [];

	const actor: AssistantActor = {
		userId,
		scopeType: organizationId ? "organization" : "user",
		scopeId: String(organizationId ?? userId),
		locale,
		timezone,
		fullName: profile.name,
		teamName: profile.roles[0]?.organization.name ?? null,
		baseCurrency: /^[A-Z]{3}$/.test(currency) ? currency : "USD",
		dateFormat:
			typeof meta.dateFormat === "string" ? meta.dateFormat.slice(0, 50) : null,
		timeFormat: meta.timeFormat === 24 ? 24 : 12,
		countryCode:
			typeof meta.countryCode === "string" &&
			/^[A-Za-z]{2}$/.test(meta.countryCode)
				? meta.countryCode.toUpperCase()
				: null,
		grants: generatePermissions(
			role?.name,
			mergePermissionRecords(rolePermissions, specificPermissions),
		) as unknown as Record<string, boolean>,
	};
	return hasAssistantAccess(actor.grants) ? actor : null;
}

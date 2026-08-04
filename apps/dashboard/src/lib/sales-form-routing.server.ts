import "server-only";

import { prisma } from "@/db";
import { getServerAuthSession } from "@/lib/auth/session";
import {
	SALES_FORM_PREFERENCE_COOKIE,
	parseSalesFormPreferenceCookie,
	resolveCurrentSalesFormCookieMode,
} from "@/lib/sales-form-preference";
import {
	SALES_FORM_MODE_PARAM,
	type SalesFormDocumentMode,
	type SalesFormDocumentType,
	type SalesFormPreferenceMode,
	type SalesFormSurface,
	buildSalesFormHref,
	normalizeSalesFormPreferenceMode,
	resolveSalesFormSurface,
} from "@gnd/sales/sales-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export async function resolveSalesFormRequest(input: {
	currentSurface: SalesFormSurface;
	mode: SalesFormDocumentMode;
	type: SalesFormDocumentType;
	slug?: string | null;
	searchParams?: SearchParams;
}) {
	const session = await getServerAuthSession();
	const userId = Number(session?.user?.id);
	if (!Number.isInteger(userId) || userId <= 0) {
		redirect("/login/v2");
	}

	const queryMode = normalizeSalesFormPreferenceMode(
		getFirstSearchParam(input.searchParams?.[SALES_FORM_MODE_PARAM]),
	);
	const cookieStore = await cookies();
	const preferenceCookie = parseSalesFormPreferenceCookie(
		cookieStore.get(SALES_FORM_PREFERENCE_COOKIE)?.value,
		userId,
	);
	let databasePreference: {
		mode: "NEW" | "LEGACY";
		updatedAt: Date;
	} | null = null;

	if (
		queryMode !== "new" &&
		(!preferenceCookie || preferenceCookie.mode === "legacy")
	) {
		databasePreference = await prisma.salesFormPreference.findUnique({
			where: { userId },
			select: { mode: true, updatedAt: true },
		});
	}
	const databaseMode: SalesFormPreferenceMode | null =
		databasePreference?.mode === "LEGACY"
			? "legacy"
			: databasePreference?.mode === "NEW"
				? "new"
				: null;
	const cookieMode = resolveCurrentSalesFormCookieMode(
		preferenceCookie,
		databasePreference,
	);

	const resolved = resolveSalesFormSurface({
		queryMode,
		cookieMode,
		databaseMode,
	});

	if (resolved.surface !== input.currentSurface) {
		redirect(
			buildSalesFormHref({
				surface: resolved.surface,
				mode: input.mode,
				type: input.type,
				slug: input.slug,
				searchParams: input.searchParams,
				queryMode: resolved.source === "query" ? queryMode : null,
			}),
		);
	}

	return {
		userId,
		resolved,
		shouldPromptLegacyPreference:
			input.currentSurface === "legacy" &&
			queryMode === "legacy" &&
			!cookieMode &&
			!databaseMode,
	};
}

function getFirstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

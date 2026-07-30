import "server-only";

import { prisma } from "@/db";
import { getServerAuthSession } from "@/lib/auth/session";
import {
	SALES_FORM_PREFERENCE_COOKIE,
	parseSalesFormPreferenceCookie,
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
	let databaseMode: SalesFormPreferenceMode | null = null;

	if (!preferenceCookie && queryMode !== "new") {
		const preference = await prisma.salesFormPreference.findUnique({
			where: { userId },
			select: { mode: true },
		});
		databaseMode =
			preference?.mode === "LEGACY"
				? "legacy"
				: preference?.mode === "NEW"
					? "new"
					: null;
	}

	const resolved = resolveSalesFormSurface({
		queryMode,
		cookieMode: preferenceCookie?.mode ?? null,
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
			!preferenceCookie &&
			!databaseMode,
	};
}

function getFirstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

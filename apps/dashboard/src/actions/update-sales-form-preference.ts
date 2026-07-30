"use server";

import { prisma } from "@/db";
import { getServerAuthSession } from "@/lib/auth/session";
import {
	SALES_FORM_PREFERENCE_COOKIE,
	SALES_FORM_PREFERENCE_COOKIE_MAX_AGE,
	serializeSalesFormPreferenceCookie,
} from "@/lib/sales-form-preference";
import {
	recordLegacySalesFormOnce,
	setSalesFormPreference,
} from "@api/db/queries/sales-form-adoption";
import type { TRPCContext } from "@api/trpc/init";
import type {
	SalesFormDocumentMode,
	SalesFormDocumentType,
	SalesFormPreferenceMode,
} from "@gnd/sales/sales-form";
import { cookies } from "next/headers";

export async function updateMySalesFormPreference(input: {
	mode: SalesFormPreferenceMode;
}) {
	if (input.mode !== "new" && input.mode !== "legacy") {
		throw new Error("Invalid sales form preference.");
	}
	const { ctx, userId } = await getAuthenticatedContext();
	const mode = input.mode === "legacy" ? "LEGACY" : "NEW";
	const result = await setSalesFormPreference(ctx, {
		mode,
		source: input.mode === "legacy" ? "legacy_prompt" : "form_switcher",
	});

	(await cookies()).set(
		SALES_FORM_PREFERENCE_COOKIE,
		serializeSalesFormPreferenceCookie({
			userId,
			mode: input.mode,
			updatedAt: result.updatedAt,
		}),
		{
			httpOnly: true,
			maxAge: SALES_FORM_PREFERENCE_COOKIE_MAX_AGE,
			path: "/",
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
		},
	);

	return {
		mode: input.mode,
		updatedAt: result.updatedAt,
	};
}

export async function recordLegacySalesFormOnceAction(input: {
	type: SalesFormDocumentType;
	mode: SalesFormDocumentMode;
}) {
	if (
		(input.type !== "order" && input.type !== "quote") ||
		(input.mode !== "create" && input.mode !== "edit")
	) {
		throw new Error("Invalid legacy sales form context.");
	}
	const { ctx } = await getAuthenticatedContext();
	return recordLegacySalesFormOnce(ctx, input);
}

async function getAuthenticatedContext() {
	const session = await getServerAuthSession();
	const userId = Number(session?.user?.id);
	if (!Number.isInteger(userId) || userId <= 0) {
		throw new Error("Authentication is required.");
	}
	return {
		userId,
		ctx: {
			db: prisma,
			userId,
		} as TRPCContext,
	};
}

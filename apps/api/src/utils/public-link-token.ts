import { randomBytes } from "node:crypto";
import type { Db, Prisma } from "@gnd/db";

const TOKEN_BYTES = 12;

export const PUBLIC_LINK_RESOURCE_TYPES = {
	salesDocumentSnapshot: "sales_document_snapshot",
} as const;

export const PUBLIC_LINK_KINDS = {
	salesDocumentPreview: "sales_document_preview",
} as const;

function generatePublicToken() {
	return randomBytes(TOKEN_BYTES).toString("base64url");
}

function isExpired(expiresAt?: Date | null) {
	return !!expiresAt && expiresAt.getTime() <= Date.now();
}

export async function createPublicLinkToken(input: {
	db: Db;
	kind: string;
	resourceType: string;
	resourceId: string;
	expiresAt?: Date | null;
	meta?: Prisma.InputJsonValue | null;
}) {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		try {
			return await input.db.publicLinkToken.create({
				data: {
					token: generatePublicToken(),
					kind: input.kind,
					resourceType: input.resourceType,
					resourceId: input.resourceId,
					expiresAt: input.expiresAt ?? null,
					meta: input.meta ?? undefined,
				},
			});
		} catch (error) {
			if (
				error instanceof Error &&
				"code" in error &&
				error.code === "P2002"
			) {
				continue;
			}
			throw error;
		}
	}

	throw new Error("Unable to create a unique public link token.");
}

export async function findActivePublicLinkTokenByResource(input: {
	db: Db;
	kind: string;
	resourceType: string;
	resourceId: string;
}) {
	const token = await input.db.publicLinkToken.findFirst({
		where: {
			kind: input.kind,
			resourceType: input.resourceType,
			resourceId: input.resourceId,
			revokedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	if (!token || isExpired(token.expiresAt ?? null)) {
		return null;
	}

	return token;
}

export async function getActivePublicLinkToken(input: {
	db: Db;
	token: string;
}) {
	const record = await input.db.publicLinkToken.findFirst({
		where: {
			token: input.token,
			revokedAt: null,
		},
	});

	if (!record || isExpired(record.expiresAt ?? null)) {
		return null;
	}

	return record;
}

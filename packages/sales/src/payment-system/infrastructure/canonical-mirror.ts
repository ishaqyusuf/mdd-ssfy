import { type Db, Prisma, type TransactionClient } from "@gnd/db";

type MirrorDb = Db | TransactionClient;

const tableCache = new WeakMap<object, Map<string, boolean>>();

function mirrorEnabled() {
	return !["0", "false", "off", "no"].includes(
		String(process.env.PAYMENT_SYSTEM_CANONICAL_MIRROR ?? "1")
			.trim()
			.toLowerCase(),
	);
}

async function hasTable(db: MirrorDb, tableName: string) {
	if (!mirrorEnabled()) return false;

	const cacheKey = db as object;
	let cache = tableCache.get(cacheKey);
	if (!cache) {
		cache = new Map();
		tableCache.set(cacheKey, cache);
	}
	if (cache.has(tableName)) {
		return cache.get(tableName) ?? false;
	}

	const rows = (await db.$queryRaw(
		Prisma.sql`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
      LIMIT 1
    `,
	)) as Array<{ TABLE_NAME?: string }>;
	const exists = rows.length > 0;
	cache.set(tableName, exists);
	return exists;
}

async function hasPaymentTables(db: MirrorDb) {
	const [ledger, allocation, projection] = await Promise.all([
		hasTable(db, "PaymentLedgerEntry"),
		hasTable(db, "PaymentAllocation"),
		hasTable(db, "PaymentProjection"),
	]);
	return ledger && allocation && projection;
}

async function hasResolutionTables(db: MirrorDb) {
	const [caseTable, findingTable, actionTable] = await Promise.all([
		hasTable(db, "ResolutionCase"),
		hasTable(db, "ResolutionFinding"),
		hasTable(db, "ResolutionAction"),
	]);
	return caseTable && findingTable && actionTable;
}

function paymentEntryType(paymentMethod: string) {
	if (paymentMethod === "link") return "checkout_completed";
	if (paymentMethod === "wallet") return "wallet_payment_applied";
	return "manual_payment_recorded";
}

function makeMirrorId(prefix: string) {
	return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

async function syncPaymentProjection(db: MirrorDb, salesId: number) {
	if (!(await hasTable(db, "PaymentProjection"))) return;

	const order = await db.salesOrders.findUnique({
		where: {
			id: salesId,
		},
		select: {
			grandTotal: true,
			payments: {
				where: {
					deletedAt: null,
					status: "success",
				},
				select: {
					amount: true,
				},
			},
		},
	});
	if (!order) return;

	const positive = order.payments
		.filter((payment) => (payment.amount || 0) > 0)
		.reduce((sum, payment) => sum + (payment.amount || 0), 0);
	const refunded = order.payments
		.filter((payment) => (payment.amount || 0) < 0)
		.reduce((sum, payment) => sum + Math.abs(payment.amount || 0), 0);
	const grandTotal = order.grandTotal || 0;
	const amountDue = Math.max(grandTotal - (positive - refunded), 0);

	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentProjection (
        salesOrderId,
        totalRecorded,
        totalAllocated,
        totalRefunded,
        totalVoided,
        amountDue,
        projectionState,
        version,
        lastSyncedAt,
        createdAt,
        updatedAt
      ) VALUES (
        ${salesId},
        ${positive},
        ${positive},
        ${refunded},
        ${0},
        ${amountDue},
        ${"active"},
        ${1},
        NOW(),
        NOW(),
        NOW()
      )
      ON DUPLICATE KEY UPDATE
        totalRecorded = VALUES(totalRecorded),
        totalAllocated = VALUES(totalAllocated),
        totalRefunded = VALUES(totalRefunded),
        totalVoided = VALUES(totalVoided),
        amountDue = VALUES(amountDue),
        projectionState = VALUES(projectionState),
        version = version + 1,
        lastSyncedAt = NOW(),
        updatedAt = NOW()
    `,
	);
}

export interface MirrorPostedLegacySalesPaymentInput {
	amount: number;
	customerTransactionId?: number | null;
	paymentMethod: string;
	salesId: number;
	salesPaymentId: number;
	squarePaymentId?: string | null;
	walletId: number;
}

export async function mirrorPostedLegacySalesPayment(
	db: MirrorDb,
	input: MirrorPostedLegacySalesPaymentInput,
) {
	if (!(await hasPaymentTables(db))) return;

	const ledgerId = makeMirrorId("ledger");
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentLedgerEntry (
        id,
        entryType,
        status,
        amount,
        currency,
        occurredAt,
        salesOrderId,
        walletId,
        customerTxId,
        salesPaymentId,
        squarePaymentId,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${ledgerId},
        ${paymentEntryType(input.paymentMethod)},
        ${"posted"},
        ${input.amount},
        ${"USD"},
        NOW(),
        ${input.salesId},
        ${input.walletId},
        ${input.customerTransactionId || null},
        ${input.salesPaymentId},
        ${input.squarePaymentId || null},
        ${JSON.stringify({
					source: "legacy-sales-payment",
					salesPaymentId: input.salesPaymentId,
				})},
        NOW(),
        NOW()
      )
    `,
	);
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentAllocation (
        id,
        ledgerEntryId,
        salesOrderId,
        amount,
        allocationType,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${makeMirrorId("allocation")},
        ${ledgerId},
        ${input.salesId},
        ${input.amount},
        ${"payment"},
        ${JSON.stringify({
					source: "legacy-sales-payment",
					salesPaymentId: input.salesPaymentId,
				})},
        NOW(),
        NOW()
      )
    `,
	);

	await syncPaymentProjection(db, input.salesId);
}

export async function mirrorVoidedLegacySalesPayment(
	db: MirrorDb,
	input: { salesId: number; salesPaymentId: number },
) {
	if (!(await hasPaymentTables(db))) return;

	await db.$executeRaw(
		Prisma.sql`
      UPDATE PaymentLedgerEntry
      SET status = ${"voided"}, updatedAt = NOW(), deletedAt = NOW()
      WHERE salesPaymentId = ${input.salesPaymentId}
    `,
	);
	await syncPaymentProjection(db, input.salesId);
}

export async function mirrorCancelledLegacyCustomerTransaction(
	db: MirrorDb,
	input: { customerTransactionId: number },
) {
	if (!(await hasPaymentTables(db))) return;

	await db.$executeRaw(
		Prisma.sql`
      UPDATE PaymentLedgerEntry
      SET status = ${"voided"}, updatedAt = NOW(), deletedAt = NOW()
      WHERE customerTxId = ${input.customerTransactionId}
    `,
	);
}

export async function mirrorLegacyRefundSalesPayment(
	db: MirrorDb,
	input: {
		amount: number;
		customerTransactionId: number;
		salesId: number;
		salesPaymentId: number;
		walletId?: number | null;
	},
) {
	if (!(await hasPaymentTables(db))) return;

	const ledgerId = makeMirrorId("ledger");
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentLedgerEntry (
        id,
        entryType,
        status,
        amount,
        currency,
        occurredAt,
        salesOrderId,
        walletId,
        customerTxId,
        salesPaymentId,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${ledgerId},
        ${"refund_recorded"},
        ${"posted"},
        ${input.amount},
        ${"USD"},
        NOW(),
        ${input.salesId},
        ${input.walletId || null},
        ${input.customerTransactionId},
        ${input.salesPaymentId},
        ${JSON.stringify({
					source: "legacy-refund-sales-payment",
					salesPaymentId: input.salesPaymentId,
				})},
        NOW(),
        NOW()
      )
    `,
	);
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentAllocation (
        id,
        ledgerEntryId,
        salesOrderId,
        amount,
        allocationType,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${makeMirrorId("allocation")},
        ${ledgerId},
        ${input.salesId},
        ${input.amount},
        ${"refund"},
        ${JSON.stringify({
					source: "legacy-refund-sales-payment",
					salesPaymentId: input.salesPaymentId,
				})},
        NOW(),
        NOW()
      )
    `,
	);
	await syncPaymentProjection(db, input.salesId);
}

export async function mirrorLegacyWalletRefundTransaction(
	db: MirrorDb,
	input: {
		amount: number;
		customerTransactionId: number;
		reason: string;
		walletId: number;
	},
) {
	if (!(await hasTable(db, "PaymentLedgerEntry"))) return;

	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO PaymentLedgerEntry (
        id,
        entryType,
        status,
        amount,
        currency,
        occurredAt,
        walletId,
        customerTxId,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${makeMirrorId("ledger")},
        ${"refund_recorded"},
        ${"posted"},
        ${input.amount},
        ${"USD"},
        NOW(),
        ${input.walletId},
        ${input.customerTransactionId},
        ${JSON.stringify({
					source: "legacy-wallet-refund",
					reason: input.reason,
				})},
        NOW(),
        NOW()
      )
    `,
	);
}

export async function mirrorLegacySalesResolution(
	db: MirrorDb,
	input: {
		action: string;
		reason: string;
		resolvedBy: string;
		salesId: number;
	},
) {
	if (!(await hasResolutionTables(db))) return;

	const caseId = makeMirrorId("resolution");
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO ResolutionCase (
        id,
        scopeType,
        scopeId,
        status,
        summary,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${caseId},
        ${"sales-order"},
        ${String(input.salesId)},
        ${"resolved"},
        ${`${input.action}: ${input.reason}`},
        ${JSON.stringify({
					salesId: input.salesId,
					resolvedBy: input.resolvedBy,
				})},
        NOW(),
        NOW()
      )
    `,
	);
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO ResolutionFinding (
        id,
        resolutionCaseId,
        findingType,
        severity,
        status,
        snapshot,
        createdAt,
        updatedAt
      ) VALUES (
        ${makeMirrorId("finding")},
        ${caseId},
        ${input.action},
        ${"info"},
        ${"resolved"},
        ${JSON.stringify({ reason: input.reason })},
        NOW(),
        NOW()
      )
    `,
	);
	await db.$executeRaw(
		Prisma.sql`
      INSERT INTO ResolutionAction (
        id,
        resolutionCaseId,
        actionType,
        status,
        beforeState,
        afterState,
        meta,
        createdAt,
        updatedAt
      ) VALUES (
        ${makeMirrorId("action")},
        ${caseId},
        ${input.action},
        ${"completed"},
        ${JSON.stringify({ reason: input.reason })},
        ${JSON.stringify({ resolvedBy: input.resolvedBy })},
        ${JSON.stringify({ salesId: input.salesId })},
        NOW(),
        NOW()
      )
    `,
	);
}

export async function syncCanonicalPaymentProjection(
	db: MirrorDb,
	input: { salesId: number },
) {
	await syncPaymentProjection(db, input.salesId);
}

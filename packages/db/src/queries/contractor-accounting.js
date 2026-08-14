import { Prisma, } from "@prisma/client";
export async function assertContractorAccountingDateWritable(db, effectiveAt) {
    const closedPeriod = await db.contractorAccountingPeriod.findFirst({
        where: {
            status: "CLOSED",
            from: { lte: effectiveAt },
            toExclusive: { gt: effectiveAt },
        },
        select: { id: true },
    });
    if (closedPeriod) {
        throw new Error("Contractor accounting period is closed; reopen it before posting this entry.");
    }
}
function decimalEquals(left, right) {
    return left.toString() === right.toString();
}
export async function postContractorLedgerEntry(db, input) {
    await assertContractorAccountingDateWritable(db, input.effectiveAt);
    const existing = await db.contractorLedgerEntry.findUnique({
        where: { sourceKey: input.sourceKey },
    });
    if (existing) {
        const matches = existing.contractorId === input.contractorId &&
            existing.type === input.type &&
            existing.sourceType === input.sourceType &&
            existing.sourceId === input.sourceId &&
            existing.effectiveAt.getTime() === input.effectiveAt.getTime() &&
            decimalEquals(existing.amount, input.amount) &&
            decimalEquals(existing.liabilityDelta, input.liabilityDelta);
        if (!matches) {
            throw new Error(`Ledger source ${input.sourceKey} already exists with different accounting values.`);
        }
        return existing;
    }
    return db.contractorLedgerEntry.create({
        data: {
            ...input,
            evidence: input.evidence ?? undefined,
            meta: input.meta ?? undefined,
        },
    });
}
export async function reverseContractorLedgerEntry(db, input) {
    const original = await db.contractorLedgerEntry.findUnique({
        where: { id: input.entryId },
        include: { reversedBy: { select: { id: true } } },
    });
    if (!original)
        throw new Error("Contractor ledger entry was not found.");
    if (original.reversedBy)
        throw new Error("Ledger entry has already been reversed.");
    await assertContractorAccountingDateWritable(db, input.effectiveAt);
    return db.contractorLedgerEntry.create({
        data: {
            contractorId: original.contractorId,
            type: "REVERSAL",
            amount: original.amount.abs(),
            liabilityDelta: original.liabilityDelta.negated(),
            effectiveAt: input.effectiveAt,
            sourceType: input.sourceType ?? "MANUAL_ADJUSTMENT",
            sourceId: input.sourceId ?? `reversal:${original.id}`,
            sourceKey: input.sourceKey ?? `MANUAL_ADJUSTMENT:reversal:${original.id}`,
            description: input.reason,
            jobId: original.jobId,
            paymentId: original.paymentId,
            paymentAdjustmentId: original.paymentAdjustmentId,
            createdById: input.actorId,
            reversalOfId: original.id,
            meta: {
                originalSourceKey: original.sourceKey,
                reason: input.reason,
            },
        },
    });
}
async function buildLedgerWhere(db, input) {
    const and = [];
    if (input.from || input.toExclusive) {
        and.push({
            effectiveAt: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.toExclusive ? { lt: input.toExclusive } : {}),
            },
        });
    }
    if (input.contractorIds?.length) {
        and.push({ contractorId: { in: input.contractorIds } });
    }
    if (input.entryTypes?.length)
        and.push({ type: { in: input.entryTypes } });
    if (input.sourceTypes?.length) {
        and.push({ sourceType: { in: input.sourceTypes } });
    }
    if (input.amountMin != null || input.amountMax != null) {
        and.push({
            amount: {
                ...(input.amountMin != null ? { gte: input.amountMin } : {}),
                ...(input.amountMax != null ? { lte: input.amountMax } : {}),
            },
        });
    }
    if (input.exceptionsOnly) {
        const issues = await db.contractorReconciliationIssue.findMany({
            where: { status: "OPEN", ledgerEntryId: { not: null } },
            select: { ledgerEntryId: true },
            take: 10_000,
        });
        and.push({
            id: {
                in: issues.flatMap((issue) => issue.ledgerEntryId ? [issue.ledgerEntryId] : []),
            },
        });
    }
    if (input.q?.trim()) {
        const q = input.q.trim();
        const contractors = await db.users.findMany({
            where: {
                deletedAt: null,
                OR: [
                    { name: { contains: q } },
                    { email: { contains: q } },
                    { phoneNo: { contains: q } },
                ],
            },
            select: { id: true },
            take: 250,
        });
        and.push({
            OR: [
                { contractorId: { in: contractors.map(({ id }) => id) } },
                { description: { contains: q } },
                { sourceId: { contains: q } },
                { sourceKey: { contains: q } },
            ],
        });
    }
    return and.length ? { AND: and } : {};
}
export async function listContractorLedgerEntries(db, input) {
    const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 100);
    const sortDirection = input.sortDirection ?? "desc";
    const where = await buildLedgerWhere(db, input);
    const rows = await db.contractorLedgerEntry.findMany({
        where,
        orderBy: [{ effectiveAt: sortDirection }, { id: sortDirection }],
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        take: pageSize + 1,
        include: {
            reversedBy: { select: { id: true, effectiveAt: true } },
            reversalOf: { select: { id: true, effectiveAt: true } },
        },
    });
    const hasNextPage = rows.length > pageSize;
    const data = hasNextPage ? rows.slice(0, pageSize) : rows;
    const contractorIds = [...new Set(data.map((entry) => entry.contractorId))];
    const contractors = contractorIds.length
        ? await db.users.findMany({
            where: { id: { in: contractorIds } },
            select: { id: true, name: true, email: true },
        })
        : [];
    const contractorMap = new Map(contractors.map((contractor) => [contractor.id, contractor]));
    const ids = data.map((entry) => entry.id);
    const balances = ids.length
        ? await db.$queryRaw(Prisma.sql `
					SELECT page.id, SUM(all_entries.liabilityDelta) AS balanceAfter
					FROM ContractorLedgerEntry AS page
					INNER JOIN ContractorLedgerEntry AS all_entries
						ON all_entries.contractorId = page.contractorId
						AND (
							all_entries.effectiveAt < page.effectiveAt
							OR (
								all_entries.effectiveAt = page.effectiveAt
								AND all_entries.id <= page.id
							)
						)
					WHERE page.id IN (${Prisma.join(ids)})
					GROUP BY page.id
				`)
        : [];
    const balanceMap = new Map(balances.map((balance) => [balance.id, balance.balanceAfter]));
    return {
        data: data.map((entry) => ({
            ...entry,
            contractor: contractorMap.get(entry.contractorId) ?? null,
            balanceAfter: balanceMap.get(entry.id) ?? null,
        })),
        meta: {
            cursor: hasNextPage ? (data[data.length - 1]?.id ?? null) : null,
        },
    };
}
export async function getContractorLedgerEntry(db, id) {
    const entry = await db.contractorLedgerEntry.findUnique({
        where: { id },
        include: { reversalOf: true, reversedBy: true },
    });
    if (!entry)
        return null;
    const contractor = await db.users.findFirst({
        where: { id: entry.contractorId },
        select: { id: true, name: true, email: true, phoneNo: true },
    });
    return { ...entry, contractor };
}
export async function getContractorLedgerEntriesThrough(db, input) {
    const limit = Math.min(input.limit ?? 100_000, 100_000);
    const rows = await db.contractorLedgerEntry.findMany({
        where: {
            effectiveAt: { lt: input.toExclusive },
            ...(input.contractorIds?.length
                ? { contractorId: { in: input.contractorIds } }
                : {}),
        },
        orderBy: [{ effectiveAt: "asc" }, { id: "asc" }],
        take: limit + 1,
    });
    if (rows.length > limit) {
        throw new Error("Contractor ledger report is too large; narrow the period or contractor filter.");
    }
    const contractorIds = [...new Set(rows.map((row) => row.contractorId))];
    const contractors = contractorIds.length
        ? await db.users.findMany({
            where: { id: { in: contractorIds } },
            select: { id: true, name: true },
        })
        : [];
    return {
        entries: rows,
        contractors: new Map(contractors.map((item) => [item.id, item])),
    };
}
export async function listContractorAccountingPeriods(db) {
    return db.contractorAccountingPeriod.findMany({
        orderBy: [{ from: "desc" }, { createdAt: "desc" }],
        include: {
            events: { orderBy: { createdAt: "desc" }, take: 5 },
        },
        take: 60,
    });
}
export async function closeContractorAccountingPeriod(db, input) {
    return db.$transaction(async (tx) => {
        const overlapping = await tx.contractorAccountingPeriod.findFirst({
            where: {
                status: "CLOSED",
                from: { lt: input.toExclusive },
                toExclusive: { gt: input.from },
                NOT: {
                    from: input.from,
                    toExclusive: input.toExclusive,
                    timezone: input.timezone,
                },
            },
            select: { id: true },
        });
        if (overlapping) {
            throw new Error("This period overlaps an already closed accounting period.");
        }
        const now = new Date();
        const period = await tx.contractorAccountingPeriod.upsert({
            where: {
                from_toExclusive_timezone: {
                    from: input.from,
                    toExclusive: input.toExclusive,
                    timezone: input.timezone,
                },
            },
            create: {
                from: input.from,
                toExclusive: input.toExclusive,
                timezone: input.timezone,
                status: "CLOSED",
                closingBalance: input.closingBalance,
                snapshot: input.snapshot,
                snapshotHash: input.snapshotHash,
                closedAt: now,
                closedById: input.actorId,
            },
            update: {
                status: "CLOSED",
                closingBalance: input.closingBalance,
                snapshot: input.snapshot,
                snapshotHash: input.snapshotHash,
                closedAt: now,
                closedById: input.actorId,
                reopenedAt: null,
                reopenedById: null,
                reopenReason: null,
            },
        });
        await tx.contractorAccountingPeriodEvent.create({
            data: {
                periodId: period.id,
                type: "CLOSED",
                actorId: input.actorId,
                snapshot: input.snapshot,
                snapshotHash: input.snapshotHash,
            },
        });
        return period;
    });
}
export async function reopenContractorAccountingPeriod(db, input) {
    return db.$transaction(async (tx) => {
        const period = await tx.contractorAccountingPeriod.findUnique({
            where: { id: input.periodId },
        });
        if (!period)
            throw new Error("Accounting period was not found.");
        if (period.status !== "CLOSED") {
            throw new Error("Accounting period is already open.");
        }
        const updated = await tx.contractorAccountingPeriod.update({
            where: { id: period.id },
            data: {
                status: "OPEN",
                reopenedAt: new Date(),
                reopenedById: input.actorId,
                reopenReason: input.reason,
            },
        });
        await tx.contractorAccountingPeriodEvent.create({
            data: {
                periodId: period.id,
                type: "REOPENED",
                actorId: input.actorId,
                reason: input.reason,
                snapshot: period.snapshot ?? undefined,
                snapshotHash: period.snapshotHash,
            },
        });
        return updated;
    });
}
export async function listContractorReconciliationIssues(db, input) {
    const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 100);
    const rows = await db.contractorReconciliationIssue.findMany({
        where: {
            ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
            ...(input.codes?.length ? { code: { in: input.codes } } : {}),
            ...(input.contractorIds?.length
                ? { contractorId: { in: input.contractorIds } }
                : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        take: pageSize + 1,
        include: {
            run: {
                select: {
                    id: true,
                    from: true,
                    toExclusive: true,
                    timezone: true,
                    status: true,
                },
            },
        },
    });
    const hasNextPage = rows.length > pageSize;
    const data = hasNextPage ? rows.slice(0, pageSize) : rows;
    const contractorIds = [
        ...new Set(data.flatMap((issue) => issue.contractorId == null ? [] : [issue.contractorId])),
    ];
    const contractors = contractorIds.length
        ? await db.users.findMany({
            where: { id: { in: contractorIds } },
            select: { id: true, name: true },
        })
        : [];
    const contractorMap = new Map(contractors.map((contractor) => [contractor.id, contractor]));
    return {
        data: data.map((issue) => ({
            ...issue,
            contractor: issue.contractorId == null
                ? null
                : (contractorMap.get(issue.contractorId) ?? null),
        })),
        meta: {
            cursor: hasNextPage ? (data[data.length - 1]?.id ?? null) : null,
        },
    };
}
export async function reviewContractorReconciliationIssue(db, input) {
    return db.contractorReconciliationIssue.update({
        where: { id: input.id },
        data: {
            status: input.status,
            reviewedAt: new Date(),
            reviewedById: input.actorId,
            resolutionNote: input.note,
        },
    });
}
export async function recordContractorReconciliationRun(db, input) {
    return db.$transaction(async (tx) => {
        const run = await tx.contractorReconciliationRun.create({
            data: {
                from: input.from,
                toExclusive: input.toExclusive,
                timezone: input.timezone,
                status: input.issues.length ? "ISSUES_FOUND" : "MATCHED",
                sourceTotals: input.sourceTotals,
                ledgerTotals: input.ledgerTotals,
                startedAt: new Date(),
                completedAt: new Date(),
                requestedById: input.requestedById,
            },
        });
        if (input.issues.length) {
            await tx.contractorReconciliationIssue.createMany({
                data: input.issues.map((issue) => ({
                    runId: run.id,
                    code: issue.code,
                    contractorId: issue.contractorId ?? null,
                    ledgerEntryId: issue.ledgerEntryId ?? null,
                    message: issue.message,
                    expectedAmount: issue.expectedAmount ?? null,
                    actualAmount: issue.actualAmount ?? null,
                    differenceAmount: issue.differenceAmount ?? null,
                    evidence: issue.evidence ?? undefined,
                })),
            });
        }
        return {
            ...run,
            issueCount: input.issues.length,
        };
    });
}
export async function getContractorAccountingFilterOptions(db) {
    const contractorIds = await db.contractorLedgerEntry.findMany({
        distinct: ["contractorId"],
        select: { contractorId: true },
        take: 2_000,
    });
    const contractors = contractorIds.length
        ? await db.users.findMany({
            where: {
                id: { in: contractorIds.map(({ contractorId }) => contractorId) },
                deletedAt: null,
            },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        })
        : [];
    return {
        contractors: contractors.map((contractor) => ({
            id: String(contractor.id),
            name: contractor.name || `Contractor #${contractor.id}`,
        })),
        entryTypes: [
            "OPENING_BALANCE",
            "JOB_EARNED",
            "BONUS",
            "EXPENSE",
            "DEDUCTION",
            "PAYOUT",
            "REVERSAL",
        ].map((id) => ({ id, name: id.replaceAll("_", " ").toLowerCase() })),
        sourceTypes: [
            "JOB",
            "PAYMENT",
            "PAYMENT_ADJUSTMENT",
            "MANUAL_ADJUSTMENT",
            "OPENING_BALANCE",
            "MIGRATION",
        ].map((id) => ({ id, name: id.replaceAll("_", " ").toLowerCase() })),
    };
}
export async function createContractorAccountingReportRun(db, input) {
    return db.contractorAccountingReportRun.create({ data: input });
}
export async function listContractorAccountingReportRuns(db, input) {
    return db.contractorAccountingReportRun.findMany({
        where: input.requestedById
            ? { requestedById: input.requestedById }
            : undefined,
        orderBy: { createdAt: "desc" },
        take: Math.min(input.take ?? 50, 100),
        include: { schedule: { select: { id: true, name: true } } },
    });
}
export async function createContractorAccountingReportSchedule(db, input) {
    return db.contractorAccountingReportSchedule.create({
        data: {
            ...input,
            nextRunAt: new Date(),
        },
    });
}
export async function listContractorAccountingReportSchedules(db) {
    return db.contractorAccountingReportSchedule.findMany({
        orderBy: [{ enabled: "desc" }, { createdAt: "desc" }],
        take: 100,
    });
}
export async function updateContractorAccountingReportRun(db, input) {
    return db.contractorAccountingReportRun.update({
        where: { id: input.id },
        data: {
            status: input.status,
            totals: input.totals ?? undefined,
            outputUrl: input.outputUrl,
            contentHash: input.contentHash,
            error: input.error,
            ...(input.status === "RUNNING"
                ? { startedAt: new Date() }
                : { completedAt: new Date() }),
        },
    });
}
export async function listContractorTaxProfiles(db) {
    const profiles = await db.contractorTaxProfile.findMany({
        orderBy: [{ w9Status: "asc" }, { contractorId: "asc" }],
        take: 2_000,
    });
    const contractors = profiles.length
        ? await db.users.findMany({
            where: { id: { in: profiles.map(({ contractorId }) => contractorId) } },
            select: { id: true, name: true, email: true },
        })
        : [];
    const contractorMap = new Map(contractors.map((contractor) => [contractor.id, contractor]));
    return profiles.map((profile) => ({
        ...profile,
        contractor: contractorMap.get(profile.contractorId) ?? null,
    }));
}
export async function upsertContractorTaxProfile(db, input) {
    return db.contractorTaxProfile.upsert({
        where: { contractorId: input.contractorId },
        create: input,
        update: input,
    });
}
function paymentMeta(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function money(value) {
    return new Prisma.Decimal(value.toString()).toDecimalPlaces(2);
}
async function createLedgerEntriesInBatches(db, entries, batchSize = 500) {
    for (let offset = 0; offset < entries.length; offset += batchSize) {
        await db.contractorLedgerEntry.createMany({
            data: entries.slice(offset, offset + batchSize),
            skipDuplicates: true,
        });
    }
}
export async function backfillContractorLedgerFromLegacy(db, input) {
    const exactEarnedStatuses = new Set([
        "Approved",
        "Completed",
        "Paid",
        "Payment Cancelled",
    ]);
    const [jobs, payments] = await Promise.all([
        db.jobs.findMany({
            where: {
                deletedAt: null,
                status: {
                    in: ["Approved", "Completed", "Paid", "Payment Cancelled"],
                },
            },
            select: {
                id: true,
                userId: true,
                status: true,
                amount: true,
                title: true,
                description: true,
                approvedAt: true,
                statusDate: true,
                createdAt: true,
                projectId: true,
            },
            take: 50_001,
        }),
        db.jobPayments.findMany({
            where: { deletedAt: null },
            select: {
                id: true,
                userId: true,
                amount: true,
                subTotal: true,
                createdAt: true,
                meta: true,
                adjustments: {
                    where: { deletedAt: null },
                    select: {
                        id: true,
                        type: true,
                        amount: true,
                        description: true,
                        createdAt: true,
                    },
                },
            },
            take: 25_001,
        }),
    ]);
    if (jobs.length > 50_000 || payments.length > 25_000) {
        throw new Error("Legacy contractor data exceeds the safe backfill limits; backfill in bounded date ranges.");
    }
    const missingEffectiveDates = [];
    let legacyJobDateFallbackCount = 0;
    const baseEntries = [];
    for (const job of jobs) {
        if (!exactEarnedStatuses.has(job.status))
            continue;
        const effectiveAt = job.approvedAt ?? job.statusDate ?? job.createdAt;
        if (!effectiveAt) {
            missingEffectiveDates.push(`JOB:${job.id}`);
            continue;
        }
        if (!job.approvedAt)
            legacyJobDateFallbackCount += 1;
        const amount = money(job.amount);
        baseEntries.push({
            contractorId: job.userId,
            type: "JOB_EARNED",
            amount,
            liabilityDelta: amount,
            effectiveAt,
            sourceType: "JOB",
            sourceId: String(job.id),
            sourceKey: `JOB:${job.id}`,
            description: job.description || job.title || `Job #${job.id}`,
            jobId: job.id,
            createdById: input.requestedById ?? null,
            meta: job.projectId ? { projectId: job.projectId } : undefined,
        });
    }
    const cancelledPayments = [];
    for (const payment of payments) {
        if (!payment.createdAt) {
            missingEffectiveDates.push(`PAYMENT:${payment.id}`);
            continue;
        }
        for (const adjustment of payment.adjustments) {
            const amount = money(adjustment.amount);
            const liabilityDelta = adjustment.type === "DEDUCTION" ? amount.negated() : amount;
            baseEntries.push({
                contractorId: payment.userId,
                type: adjustment.type,
                amount,
                liabilityDelta,
                effectiveAt: adjustment.createdAt ?? payment.createdAt,
                sourceType: "PAYMENT_ADJUSTMENT",
                sourceId: String(adjustment.id),
                sourceKey: `PAYMENT_ADJUSTMENT:${adjustment.id}`,
                description: adjustment.description,
                paymentId: payment.id,
                paymentAdjustmentId: adjustment.id,
                createdById: input.requestedById ?? null,
            });
        }
        const payoutAmount = money(payment.amount);
        baseEntries.push({
            contractorId: payment.userId,
            type: "PAYOUT",
            amount: payoutAmount,
            liabilityDelta: payoutAmount.negated(),
            effectiveAt: payment.createdAt,
            sourceType: "PAYMENT",
            sourceId: String(payment.id),
            sourceKey: `PAYMENT:${payment.id}`,
            description: `Contractor payout #${payment.id}`,
            paymentId: payment.id,
            createdById: input.requestedById ?? null,
        });
        const cancelledAtValue = paymentMeta(payment.meta).cancelledAt;
        if (cancelledAtValue) {
            const cancelledAt = new Date(cancelledAtValue);
            if (Number.isNaN(cancelledAt.getTime())) {
                missingEffectiveDates.push(`PAYMENT_REVERSAL:${payment.id}`);
            }
            else {
                cancelledPayments.push({
                    id: payment.id,
                    cancelledAt,
                    amount: money(payment.subTotal ?? payment.amount),
                    contractorId: payment.userId,
                });
            }
        }
    }
    const summary = {
        dryRun: input.dryRun,
        jobEntryCount: baseEntries.filter((entry) => entry.sourceType === "JOB")
            .length,
        paymentEntryCount: payments.length,
        adjustmentEntryCount: payments.reduce((total, payment) => total + payment.adjustments.length, 0),
        reversalEntryCount: cancelledPayments.length,
        legacyJobDateFallbackCount,
        missingEffectiveDates,
        totalEntryCount: baseEntries.length + cancelledPayments.length,
    };
    if (input.dryRun)
        return summary;
    await createLedgerEntriesInBatches(db, baseEntries);
    const payoutEntries = await db.contractorLedgerEntry.findMany({
        where: {
            sourceKey: {
                in: cancelledPayments.map((payment) => `PAYMENT:${payment.id}`),
            },
        },
        select: { id: true, sourceId: true },
    });
    const payoutEntryByPaymentId = new Map(payoutEntries.map((entry) => [Number(entry.sourceId), entry.id]));
    await createLedgerEntriesInBatches(db, cancelledPayments.flatMap((payment) => {
        const reversalOfId = payoutEntryByPaymentId.get(payment.id);
        if (!reversalOfId)
            return [];
        return [
            {
                contractorId: payment.contractorId,
                type: "REVERSAL",
                amount: payment.amount,
                liabilityDelta: payment.amount,
                effectiveAt: payment.cancelledAt,
                sourceType: "PAYMENT",
                sourceId: `reversal:${payment.id}`,
                sourceKey: `PAYMENT:reversal:${payment.id}`,
                description: `Cancelled contractor payout #${payment.id}`,
                paymentId: payment.id,
                reversalOfId,
                createdById: input.requestedById ?? null,
            },
        ];
    }));
    return summary;
}

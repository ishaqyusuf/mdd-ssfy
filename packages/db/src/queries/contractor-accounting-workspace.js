export async function listContractorPayoutRuns(db, input) {
    const rows = await db.contractorPayoutRun.findMany({
        where: {
            ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
            ...(input.contractorIds?.length
                ? { contractorId: { in: input.contractorIds } }
                : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(input.take ?? 100, 200),
    });
    const contractorIds = [...new Set(rows.map((row) => row.contractorId))];
    const contractors = contractorIds.length
        ? await db.users.findMany({
            where: { id: { in: contractorIds }, deletedAt: null },
            select: { id: true, name: true },
        })
        : [];
    const contractorMap = new Map(contractors.map((row) => [row.id, row]));
    return rows.map((row) => ({
        ...row,
        contractor: contractorMap.get(row.contractorId) ?? null,
    }));
}
export function createContractorPayoutRun(db, input) {
    return db.contractorPayoutRun.create({
        data: {
            ...input,
            jobIds: input.jobIds,
            filters: input.filters ?? undefined,
        },
    });
}
export async function updateContractorPayoutRunStatus(db, input) {
    const run = await db.contractorPayoutRun.findUnique({
        where: { id: input.id },
    });
    if (!run)
        throw new Error("Contractor payout run was not found.");
    if (["COMPLETED", "CANCELLED"].includes(run.status)) {
        throw new Error("Completed or cancelled payout runs cannot be changed.");
    }
    const allowed = {
        DRAFT: ["READY", "CANCELLED"],
        READY: ["HANDED_OFF", "CANCELLED"],
        HANDED_OFF: ["COMPLETED", "CANCELLED"],
    };
    if (!allowed[run.status]?.includes(input.status)) {
        throw new Error(`Payout run cannot move from ${run.status} to ${input.status}.`);
    }
    return db.contractorPayoutRun.update({
        where: { id: run.id, updatedAt: run.updatedAt },
        data: {
            status: input.status,
            ...(input.status === "READY"
                ? { reviewedById: input.actorId, reviewedAt: new Date() }
                : {}),
            ...(input.status === "HANDED_OFF" ? { handedOffAt: new Date() } : {}),
            ...(input.status === "COMPLETED"
                ? { completedAt: new Date(), paymentId: input.paymentId }
                : {}),
            ...(input.status === "CANCELLED"
                ? {
                    cancelledAt: new Date(),
                    cancelledById: input.actorId,
                    cancellationReason: input.reason,
                }
                : {}),
        },
    });
}
export function listContractorAccountingAlertRules(db) {
    return db.contractorAccountingAlertRule.findMany({
        orderBy: [{ enabled: "desc" }, { createdAt: "desc" }],
        take: 200,
    });
}
export function createContractorAccountingAlertRule(db, input) {
    return db.contractorAccountingAlertRule.create({
        data: {
            ...input,
            filters: input.filters ?? undefined,
        },
    });
}
export function updateContractorAccountingAlertRule(db, input) {
    const { id, ...data } = input;
    return db.contractorAccountingAlertRule.update({
        where: { id },
        data,
    });
}
export function listContractorAccountingAlertEvents(db, input) {
    return db.contractorAccountingAlertEvent.findMany({
        where: {
            ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
            ...(input.contractorIds?.length
                ? { contractorId: { in: input.contractorIds } }
                : {}),
        },
        include: { rule: { select: { id: true, name: true, kind: true } } },
        orderBy: [{ triggeredAt: "desc" }, { id: "desc" }],
        take: Math.min(input.take ?? 100, 200),
    });
}
export function recordContractorAccountingAlertEvent(db, input) {
    return db.contractorAccountingAlertEvent.upsert({
        where: {
            ruleId_fingerprint: {
                ruleId: input.ruleId,
                fingerprint: input.fingerprint,
            },
        },
        create: input,
        update: {
            title: input.title,
            message: input.message,
            evidence: input.evidence,
        },
    });
}
export async function updateContractorAccountingAlertEventStatus(db, input) {
    const event = await db.contractorAccountingAlertEvent.findUnique({
        where: { id: input.id },
    });
    if (!event)
        throw new Error("Accounting alert was not found.");
    return db.contractorAccountingAlertEvent.update({
        where: { id: event.id },
        data: input.status === "ACKNOWLEDGED"
            ? {
                status: input.status,
                acknowledgedAt: new Date(),
                acknowledgedById: input.actorId,
            }
            : { status: input.status, resolvedAt: new Date() },
    });
}

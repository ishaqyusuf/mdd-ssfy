import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import { z } from "zod";
import { ConnectionDenied } from "./connection-service";

const sourceKind = z.enum(["facebook_marketplace", "facebook_page"]);
const sendPolicy = z.enum(["off", "draft_only", "whatsapp_approved"]);
const status = z.enum(["enabled", "disabled"]);
const e164 = z.string().regex(/^\+[1-9]\d{7,14}$/);

function canonicalInboxUrl(value: string, kind: z.infer<typeof sourceKind>) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const facebookHost = host === "facebook.com" || host === "www.facebook.com";
  const businessHost = host === "business.facebook.com";
  if (url.protocol !== "https:" || (!facebookHost && !businessHost)) {
    throw new Error("INVALID_INBOX_URL");
  }
  if (kind === "facebook_marketplace" && !url.pathname.startsWith("/marketplace/")) {
    throw new Error("INVALID_INBOX_URL");
  }
  if (kind === "facebook_page" && !url.pathname.includes("inbox")) {
    throw new Error("INVALID_INBOX_URL");
  }
  url.hash = "";
  return url.toString();
}

const limits = {
  scanIntervalSeconds: z.coerce.number().int().min(300).max(86_400).default(900),
  pollIntervalSeconds: z.coerce.number().int().min(30).max(3_600).default(60),
  quietWindowSeconds: z.coerce.number().int().min(5).max(600).default(30),
  overlapWindowSeconds: z.coerce.number().int().min(60).max(86_400).default(300),
  maxConversationsPerScan: z.coerce.number().int().min(1).max(200).default(50),
  maxMessagesPerScan: z.coerce.number().int().min(1).max(2_000).default(500),
  maxSendsPerHour: z.coerce.number().int().min(1).max(300).default(30),
};

const configurationFields = z.object({
  canonicalInboxUrl: z.string().url().max(2_048),
  status: status.default("disabled"),
  sendPolicy: sendPolicy.default("off"),
  approverWaId: e164.optional().or(z.literal("")),
  senderReference: z.string().trim().max(191).optional().or(z.literal("")),
  rulesetId: z.string().trim().max(191).optional().or(z.literal("")),
  retentionDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  ...limits,
});

function requireApprovedSendConfiguration(value: z.infer<typeof configurationFields>, context: z.RefinementCtx) {
  if (value.sendPolicy === "whatsapp_approved" && (!value.approverWaId || !value.senderReference || !value.rulesetId)) {
    context.addIssue({ code: "custom", message: "WhatsApp-approved sending requires approver, sender and ruleset references." });
  }
}

export const createMessagingConnectionInput = configurationFields.extend({
  organizationId: z.coerce.number().int().positive(),
  sourceKind,
  externalAccountId: z.string().trim().min(1).max(191),
}).superRefine(requireApprovedSendConfiguration);

export const updateMessagingConnectionInput = configurationFields
  .extend({ connectionId: z.string().min(1).max(191) })
  .superRefine(requireApprovedSendConfiguration);

async function requireOrganizationAdmin(db: Database, actorId: number, organizationId: number) {
  const actor = await db.users.findFirst({
    where: {
      id: actorId,
      deletedAt: null,
      accessRevokedAt: null,
      roles: {
        some: {
          organizationId,
          deletedAt: null,
          organization: { deletedAt: null },
          role: { deletedAt: null, name: "Super Admin" },
        },
      },
    },
    select: { id: true },
  });
  if (!actor) throw new ConnectionDenied("not_authorized");
}

function optional(value: string | undefined) {
  return value?.trim() || null;
}

export async function createMessagingConnection(input: {
  db: Database;
  actorId: number;
  value: z.infer<typeof createMessagingConnectionInput>;
}) {
  const value = createMessagingConnectionInput.parse(input.value);
  await requireOrganizationAdmin(input.db, input.actorId, value.organizationId);
  const externalAccountId = value.externalAccountId.trim();
  return input.db.messagingConnection.create({
    data: {
      organizationId: value.organizationId,
      sourceKind: value.sourceKind,
      externalAccountId,
      externalAccountHash: createHash("sha256").update(externalAccountId).digest("hex"),
      canonicalInboxUrl: canonicalInboxUrl(value.canonicalInboxUrl, value.sourceKind),
      status: value.status,
      sendPolicy: value.sendPolicy,
      approverIdentityId: optional(value.approverWaId),
      senderReference: optional(value.senderReference),
      rulesetId: optional(value.rulesetId),
      retentionDays: value.retentionDays ?? null,
      scanIntervalSeconds: value.scanIntervalSeconds,
      pollIntervalSeconds: value.pollIntervalSeconds,
      quietWindowSeconds: value.quietWindowSeconds,
      overlapWindowSeconds: value.overlapWindowSeconds,
      maxConversationsPerScan: value.maxConversationsPerScan,
      maxMessagesPerScan: value.maxMessagesPerScan,
      maxSendsPerHour: value.maxSendsPerHour,
    },
  });
}

export async function updateMessagingConnection(input: {
  db: Database;
  actorId: number;
  value: z.infer<typeof updateMessagingConnectionInput>;
}) {
  const value = updateMessagingConnectionInput.parse(input.value);
  const current = await input.db.messagingConnection.findUnique({
    where: { id: value.connectionId },
    select: { organizationId: true, sourceKind: true },
  });
  if (!current) throw new ConnectionDenied("not_authorized");
  await requireOrganizationAdmin(input.db, input.actorId, current.organizationId);
  return input.db.messagingConnection.update({
    where: { id: value.connectionId },
    data: {
      canonicalInboxUrl: canonicalInboxUrl(value.canonicalInboxUrl, sourceKind.parse(current.sourceKind)),
      status: value.status,
      sendPolicy: value.sendPolicy,
      approverIdentityId: optional(value.approverWaId),
      senderReference: optional(value.senderReference),
      rulesetId: optional(value.rulesetId),
      retentionDays: value.retentionDays ?? null,
      scanIntervalSeconds: value.scanIntervalSeconds,
      pollIntervalSeconds: value.pollIntervalSeconds,
      quietWindowSeconds: value.quietWindowSeconds,
      overlapWindowSeconds: value.overlapWindowSeconds,
      maxConversationsPerScan: value.maxConversationsPerScan,
      maxMessagesPerScan: value.maxMessagesPerScan,
      maxSendsPerHour: value.maxSendsPerHour,
      configRevision: { increment: 1 },
    },
  });
}

export async function readConnectedConfiguration(input: {
  db: Database;
  connectionId: string;
}) {
  return input.db.messagingConnection.findUnique({
    where: { id: input.connectionId },
    select: {
      id: true,
      sourceKind: true,
      externalAccountId: true,
      canonicalInboxUrl: true,
      status: true,
      configRevision: true,
      scanIntervalSeconds: true,
      pollIntervalSeconds: true,
      quietWindowSeconds: true,
      overlapWindowSeconds: true,
      maxConversationsPerScan: true,
      maxMessagesPerScan: true,
      maxSendsPerHour: true,
      sendPolicy: true,
      retentionDays: true,
    },
  });
}

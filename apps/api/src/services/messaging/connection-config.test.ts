import { describe, expect, test } from "bun:test";
import {
  createMessagingConnectionInput,
  updateMessagingConnectionInput,
} from "./connection-config";

const valid = {
  organizationId: 7,
  sourceKind: "facebook_marketplace" as const,
  externalAccountId: "marketplace-test-account",
  canonicalInboxUrl: "https://www.facebook.com/marketplace/inbox",
  status: "enabled" as const,
  sendPolicy: "off" as const,
};

describe("Marketplace connection configuration", () => {
  test("applies bounded initial operating defaults", () => {
    const result = createMessagingConnectionInput.parse(valid);
    expect(result.scanIntervalSeconds).toBe(900);
    expect(result.pollIntervalSeconds).toBe(60);
    expect(result.quietWindowSeconds).toBe(30);
    expect(result.overlapWindowSeconds).toBe(300);
    expect(result.maxConversationsPerScan).toBe(50);
    expect(result.maxMessagesPerScan).toBe(500);
    expect(result.maxSendsPerHour).toBe(30);
  });

  test("rejects unsafe intervals and incomplete WhatsApp-approved sending", () => {
    expect(createMessagingConnectionInput.safeParse({ ...valid, scanIntervalSeconds: 60 }).success).toBe(false);
    expect(createMessagingConnectionInput.safeParse({ ...valid, sendPolicy: "whatsapp_approved" }).success).toBe(false);
    const { organizationId: _organizationId, sourceKind: _sourceKind, externalAccountId: _externalAccountId, ...configuration } = valid;
    expect(updateMessagingConnectionInput.safeParse({ ...configuration, connectionId: "connection-A", sendPolicy: "whatsapp_approved", approverWaId: "+15551234567", senderReference: "wa-sender", rulesetId: "rules-v1" }).success).toBe(true);
  });
});

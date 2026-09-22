import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import type { Database } from "@gnd/db";
import { authorizeConnectedExtension, ConnectionDenied, issueConnectionCode, redeemConnectionCode } from "./connection-service";
import { hashExtensionCredential } from "./connection-secrets";

const secret = "test-secret-long-enough-for-marketplace-code-verification";
const now = new Date("2026-09-20T10:00:00Z");
let originalSecret: string | undefined;

function fakeDatabase() {
  let code: { id: string; connectionId: string; issuerUserId: number; codeHash: string; expiresAt: Date; consumedAt: Date | null } | null = null;
  let device: { id: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null } | null = null;
  let enabled = true;
  let active = true;
  const connection = { id: "connection-A", organizationId: 7 };
  const tx = {
    messagingConnection: { findUnique: async () => ({ ...connection, status: enabled ? "enabled" : "disabled" }) },
    users: { findFirst: async ({ where }: { where: { id: number } }) => active && where.id === 42 ? { id: 42 } : null },
    messagingConnectionCode: {
      create: async ({ data }: { data: Omit<NonNullable<typeof code>, "id" | "consumedAt"> }) => { code = { ...data, id: "code-A", consumedAt: null }; },
      findUnique: async ({ where }: { where: { codeHash: string } }) => code && code.codeHash === where.codeHash ? code : null,
      updateMany: async ({ where, data }: { where: { id: string; expiresAt: { gt: Date } }; data: { consumedAt: Date } }) => {
        if (!code || code.id !== where.id || code.consumedAt || code.expiresAt <= where.expiresAt.gt) return { count: 0 };
        code.consumedAt = data.consumedAt;
        return { count: 1 };
      },
    },
    messagingDevice: {
      create: async ({ data }: { data: { tokenHash: string; expiresAt: Date } }) => {
        device = { id: "device-A", tokenHash: data.tokenHash, expiresAt: data.expiresAt, revokedAt: null };
        return { id: device.id };
      },
      findUnique: async ({ where, select }: { where: { tokenHash: string }; select: { grants: { where: { connectionId: string } } } }) =>
        device?.tokenHash === where.tokenHash ? {
          id: device.id, employeeId: 42, expiresAt: device.expiresAt, revokedAt: device.revokedAt,
          grants: select.grants.where.connectionId === connection.id ? [{ connection: { status: enabled ? "enabled" : "disabled", organizationId: 7 } }] : [],
        } : null,
    },
  };
  return {
    db: { ...tx, $transaction: async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx) } as unknown as Database,
    code: () => code,
    device: () => device,
    disable: () => { enabled = false; },
    revokeActor: () => { active = false; },
    revokeDevice: () => { if (device) device.revokedAt = now; },
  };
}

describe("one-time Marketplace connection", () => {
  beforeEach(() => { originalSecret = process.env.BETTER_AUTH_SECRET; process.env.BETTER_AUTH_SECRET = secret; });
  afterEach(() => { if (originalSecret === undefined) delete process.env.BETTER_AUTH_SECRET; else process.env.BETTER_AUTH_SECRET = originalSecret; });

  it("expires and rejects replay without creating another credential", async () => {
    const fixture = fakeDatabase();
    const { code } = await issueConnectionCode({ db: fixture.db, verifiedActorId: 42, connectionId: "connection-A", now });
    expect(fixture.code()?.codeHash).not.toBe(code);
    await expect(redeemConnectionCode({ db: fixture.db, code, label: "Chrome", extensionVersion: "1", now: new Date(now.getTime() + 300_001) })).rejects.toBeInstanceOf(ConnectionDenied);
    expect(fixture.device()).toBeNull();
    const result = await redeemConnectionCode({ db: fixture.db, code, label: "Chrome", extensionVersion: "1", now: new Date(now.getTime() + 1000) });
    expect(fixture.device()?.tokenHash).toBe(hashExtensionCredential(result.credential));
    await expect(redeemConnectionCode({ db: fixture.db, code, label: "Chrome", extensionVersion: "1", now: new Date(now.getTime() + 2000) })).rejects.toBeInstanceOf(ConnectionDenied);
  });

  it("denies foreign connection, revoked device, disabled source and removed actor", async () => {
    const fixture = fakeDatabase();
    const { code } = await issueConnectionCode({ db: fixture.db, verifiedActorId: 42, connectionId: "connection-A", now });
    const { credential } = await redeemConnectionCode({ db: fixture.db, code, label: "Chrome", extensionVersion: "1", now });
    await expect(authorizeConnectedExtension({ db: fixture.db, credential, connectionId: "connection-B", now })).rejects.toBeInstanceOf(ConnectionDenied);
    expect((await authorizeConnectedExtension({ db: fixture.db, credential, connectionId: "connection-A", now })).employeeId).toBe(42);
    fixture.disable();
    await expect(authorizeConnectedExtension({ db: fixture.db, credential, connectionId: "connection-A", now })).rejects.toBeInstanceOf(ConnectionDenied);
    const other = fakeDatabase();
    const issued = await issueConnectionCode({ db: other.db, verifiedActorId: 42, connectionId: "connection-A", now });
    const connected = await redeemConnectionCode({ db: other.db, code: issued.code, label: "Chrome", extensionVersion: "1", now });
    other.revokeActor();
    await expect(authorizeConnectedExtension({ db: other.db, credential: connected.credential, connectionId: "connection-A", now })).rejects.toBeInstanceOf(ConnectionDenied);
    other.revokeDevice();
    await expect(authorizeConnectedExtension({ db: other.db, credential: connected.credential, connectionId: "connection-A", now })).rejects.toBeInstanceOf(ConnectionDenied);
  });

});

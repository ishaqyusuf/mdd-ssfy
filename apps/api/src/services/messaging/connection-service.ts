import type { Database } from "@gnd/db";
import {
  createConnectionCode,
  createExtensionCredential,
  hashConnectionCode,
  hashExtensionCredential,
} from "./connection-secrets";

const CODE_TTL_MS = 5 * 60 * 1_000;
const CREDENTIAL_TTL_MS = 90 * 24 * 60 * 60 * 1_000;

export class ConnectionDenied extends Error {
  constructor(readonly reason: "not_authorized" | "invalid_code" | "revoked") {
    super("Marketplace connection unavailable");
  }
}

function codeSecret() {
  const secret = process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Marketplace code secret unavailable");
  return secret;
}

async function activeAdminForConnection(
  db: Pick<Database, "users" | "messagingConnection">,
  actorId: number,
  connectionId: string,
) {
  const connection = await db.messagingConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, organizationId: true, status: true },
  });
  if (!connection) throw new ConnectionDenied("not_authorized");
  const actor = await db.users.findFirst({
    where: {
      id: actorId,
      deletedAt: null,
      accessRevokedAt: null,
      roles: {
        some: {
          organizationId: connection.organizationId,
          deletedAt: null,
          organization: { deletedAt: null },
          role: { deletedAt: null, name: "Super Admin" },
        },
      },
    },
    select: { id: true },
  });
  if (!actor) throw new ConnectionDenied("not_authorized");
  return connection;
}

// The HTTP caller verifies its dashboard session and password through Better
// Auth before passing the authenticated actor ID to this service.
export async function issueConnectionCode(input: {
  db: Database;
  verifiedActorId: number;
  connectionId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const connection = await activeAdminForConnection(input.db, input.verifiedActorId, input.connectionId);
  if (connection.status !== "enabled") throw new ConnectionDenied("not_authorized");
  const code = createConnectionCode();
  await input.db.messagingConnectionCode.create({
    data: {
      connectionId: input.connectionId,
      issuerUserId: input.verifiedActorId,
      codeHash: hashConnectionCode(code, codeSecret()),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });
  return { code, expiresAt: new Date(now.getTime() + CODE_TTL_MS) };
}

// A public route must apply a shared per-source/IP attempt limit before calling
// this function, including when the code does not match any stored digest.
export async function redeemConnectionCode(input: {
  db: Database;
  code: string;
  label: string;
  extensionVersion: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  if (!/^\d{12}$/.test(input.code)) throw new ConnectionDenied("invalid_code");
  const codeHash = hashConnectionCode(input.code, codeSecret());
  const credential = createExtensionCredential();
  const device = await input.db.$transaction(async (tx) => {
    const candidate = await tx.messagingConnectionCode.findUnique({
      where: { codeHash },
      select: { id: true, connectionId: true, issuerUserId: true },
    });
    if (!candidate) throw new ConnectionDenied("invalid_code");
    const consumed = await tx.messagingConnectionCode.updateMany({
      where: {
        id: candidate.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw new ConnectionDenied("invalid_code");
    // A revoked or reassigned issuer cannot grant access by handing out an old code.
    const connection = await activeAdminForConnection(tx, candidate.issuerUserId, candidate.connectionId);
    if (connection.status !== "enabled") throw new ConnectionDenied("not_authorized");
    const device = await tx.messagingDevice.create({
      data: {
        employeeId: candidate.issuerUserId,
        label: input.label.slice(0, 100),
        extensionVersion: input.extensionVersion.slice(0, 50),
        tokenHash: hashExtensionCredential(credential),
        expiresAt: new Date(now.getTime() + CREDENTIAL_TTL_MS),
        grants: { create: { connectionId: candidate.connectionId } },
      },
      select: { id: true },
    });
    return { ...device, connectionId: candidate.connectionId };
  });
  return { credential, connectedExtensionId: device.id, connectionId: device.connectionId };
}

export async function authorizeConnectedExtension(input: {
  db: Database;
  credential: string;
  connectionId: string;
  now?: Date;
  allowDisabled?: boolean;
}) {
  let tokenHash: string;
  try {
    tokenHash = hashExtensionCredential(input.credential);
  } catch {
    throw new ConnectionDenied("revoked");
  }
  const now = input.now ?? new Date();
  const device = await input.db.messagingDevice.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      employeeId: true,
      expiresAt: true,
      revokedAt: true,
      grants: {
        where: { connectionId: input.connectionId, revokedAt: null },
        select: {
          connection: { select: { status: true, organizationId: true } },
        },
      },
    },
  });
  if (
    !device ||
    device.revokedAt ||
    !device.expiresAt ||
    device.expiresAt <= now ||
    device.grants.length !== 1 ||
    (!input.allowDisabled && device.grants[0]?.connection.status !== "enabled")
  ) throw new ConnectionDenied("revoked");
  const organizationId = device.grants[0].connection.organizationId;
  const employee = await input.db.users.findFirst({
    where: {
      id: device.employeeId,
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
  if (!employee) throw new ConnectionDenied("revoked");
  return { connectedExtensionId: device.id, employeeId: employee.id, organizationId };
}

export async function revokeConnectedExtension(input: {
  db: Database;
  actorId: number;
  connectionId: string;
  connectedExtensionId: string;
  now?: Date;
}) {
  await activeAdminForConnection(input.db, input.actorId, input.connectionId);
  const now = input.now ?? new Date();
  return input.db.$transaction(async (tx) => {
    const grant = await tx.messagingDeviceGrant.findUnique({
      where: {
        deviceId_connectionId: {
          deviceId: input.connectedExtensionId,
          connectionId: input.connectionId,
        },
      },
      select: { revokedAt: true },
    });
    if (!grant) throw new ConnectionDenied("not_authorized");
    await tx.messagingDeviceGrant.updateMany({
      where: { deviceId: input.connectedExtensionId, connectionId: input.connectionId, revokedAt: null },
      data: { revokedAt: now },
    });
    // The credential is one-connection scoped in this ticket. Removing it also
    // prevents any future grant on the same device from reusing the old secret.
    await tx.messagingDevice.updateMany({
      where: { id: input.connectedExtensionId, revokedAt: null },
      data: { revokedAt: now, tokenHash: null },
    });
    return { revoked: true };
  });
}

export async function listConnectedExtensions(input: {
  db: Database;
  actorId: number;
  connectionId: string;
}) {
  await activeAdminForConnection(input.db, input.actorId, input.connectionId);
  return input.db.messagingDeviceGrant.findMany({
    where: { connectionId: input.connectionId },
    select: {
      grantedAt: true,
      revokedAt: true,
      device: {
        select: { id: true, label: true, extensionVersion: true, createdAt: true, expiresAt: true, lastSeenAt: true, revokedAt: true },
      },
    },
    orderBy: { grantedAt: "desc" },
    take: 100,
  });
}

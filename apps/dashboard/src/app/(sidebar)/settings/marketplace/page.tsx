import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { MarketplaceConnections } from "@/components/settings/marketplace-connections";
import { getServerAuthSession } from "@/lib/auth/session";
import { db } from "@gnd/db";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceSettingsPage() {
  const session = await getServerAuthSession();
  const actorId = Number(session?.user?.id);
  if (!Number.isSafeInteger(actorId)) redirect("/");
  const actor = await db.users.findFirst({ where: { id: actorId, deletedAt: null, accessRevokedAt: null }, select: { id: true } });
  if (!actor) redirect("/");
  const roles = await db.modelHasRoles.findMany({
    where: { modelId: actorId, deletedAt: null, organization: { deletedAt: null }, role: { name: "Super Admin", deletedAt: null } },
    select: { organization: { select: { id: true, name: true } } },
  });
  const organizations = roles.map(({ organization }) => organization);
  const connections = await db.messagingConnection.findMany({
    where: {
      organization: { deletedAt: null },
      organizationId: {
        in: organizations.map((organization) => organization.id),
      },
    },
    select: {
      id: true, organizationId: true, externalAccountId: true, sourceKind: true,
      canonicalInboxUrl: true, status: true, configRevision: true,
      scanIntervalSeconds: true, pollIntervalSeconds: true, quietWindowSeconds: true,
      overlapWindowSeconds: true, maxConversationsPerScan: true,
      maxMessagesPerScan: true, maxSendsPerHour: true, sendPolicy: true,
      approverIdentityId: true, senderReference: true, rulesetId: true, retentionDays: true,
    },
    take: 50,
    orderBy: { createdAt: "desc" },
  });
  if (!organizations.length) redirect("/");
  const serialized = connections.map((connection) => ({
    ...connection,
    sourceKind: connection.sourceKind as "facebook_marketplace" | "facebook_page",
    status: connection.status as "enabled" | "disabled",
    sendPolicy: connection.sendPolicy as "off" | "draft_only" | "whatsapp_approved",
    approverWaId: connection.approverIdentityId ?? "",
    senderReference: connection.senderReference ?? "",
    rulesetId: connection.rulesetId ?? "",
  }));
  return <PageShell><ScrollableContent><div className="space-y-6 pt-6">
    <PageTitle>Marketplace automation</PageTitle>
    <MarketplaceConnections initialConnections={serialized} organizations={organizations} />
  </div></ScrollableContent></PageShell>;
}

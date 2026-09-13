import { createHash } from "node:crypto";
import type { Database } from "@gnd/db";
import { Prisma } from "@gnd/db";
import { resolveAssistantActor } from "./actor";
import { deliverNextAssistantFeatureNotification } from "./feature-requests";

export async function deliverAssistantFeatureNotification(db: Database) {
	return deliverNextAssistantFeatureNotification(db, {
		async notifyDevelopers(request) {
			const admins = await db.users.findMany({
				where: {
					deletedAt: null,
					accessRevokedAt: null,
					roles: {
						some: {
							deletedAt: null,
							role: { name: { equals: "Super Admin" }, deletedAt: null },
						},
					},
				},
				select: { id: true },
			});
			if (!admins.length)
				throw new Error("No active feature request reviewers");
			for (const admin of admins) {
				const assistantDeliveryKey = createHash("sha256")
					.update(`${request.outboxId}:developer:${admin.id}`)
					.digest("hex");
				await db.notifications.upsert({
					where: { assistantDeliveryKey },
					create: {
						assistantDeliveryKey,
						type: "assistant_feature_request",
						fromUserId: request.ownerUserId,
						userId: admin.id,
						message: request.summary,
						alert: true,
						link: "/assistant?featureRequests=triage",
						meta: { requestId: request.id },
					},
					update: {},
				});
			}
		},
		async notifySubscriber(input) {
			await db.$transaction(
				async (tx) => {
					const [subscription, outbox, actor] = await Promise.all([
						tx.assistantFeatureSubscription.findFirst({
							where: {
								id: input.subscriptionId,
								userId: input.userId,
								scopeType: input.scopeType,
								scopeId: input.scopeId,
								activeKey: "active",
								unsubscribedAt: null,
							},
							select: { id: true },
						}),
						tx.assistantFeatureNotificationOutbox.findFirst({
							where: { id: input.outboxId, status: "delivering" },
							select: { id: true },
						}),
						resolveAssistantActor(tx as never, input.userId),
					]);
					if (
						!subscription ||
						!outbox ||
						!actor ||
						actor.scopeType !== input.scopeType ||
						actor.scopeId !== input.scopeId ||
						!input.grantPolicy.allOf.every(
							(grant) => actor.grants[grant] === true,
						) ||
						(input.grantPolicy.anyOf.length > 0 &&
							!input.grantPolicy.anyOf.some(
								(grant) => actor.grants[grant] === true,
							))
					)
						throw new Error("Assistant release consent or scope changed");
					const assistantDeliveryKey = createHash("sha256")
						.update(`${input.outboxId}:subscriber:${input.userId}`)
						.digest("hex");
					await tx.notifications.upsert({
						where: { assistantDeliveryKey },
						create: {
							assistantDeliveryKey,
							type: "assistant_feature_available",
							fromUserId: input.userId,
							userId: input.userId,
							message: `${input.title} is ready to use.`,
							alert: true,
							link: "/assistant?featureRequests=mine",
							meta: {
								requestId: input.requestId,
								capabilityKey: input.capabilityKey,
								version: input.version,
							},
						},
						update: {},
					});
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);
		},
		async canAccess(userId, grantPolicy, scope) {
			const actor = await resolveAssistantActor(db, userId);
			return Boolean(
				actor &&
					actor.scopeType === scope.scopeType &&
					actor.scopeId === scope.scopeId &&
					grantPolicy.allOf.every((grant) => actor.grants[grant] === true) &&
					(!grantPolicy.anyOf.length ||
						grantPolicy.anyOf.some((grant) => actor.grants[grant] === true)),
			);
		},
	});
}

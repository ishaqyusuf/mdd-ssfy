import { getUserIdsWithPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import { EmailService } from "@gnd/notifications/services/email-service";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const payloadSchema = z.object({ inquiryId: z.string().trim().min(1) });

function stringArray(value: unknown) {
	return Array.isArray(value) ? value.map(String) : [];
}

export const sendStorefrontCustomInquiryNotifications = schemaTask({
	id: "storefront-custom-inquiry-submitted",
	schema: payloadSchema,
	maxDuration: 120,
	queue: { concurrencyLimit: 5 },
	run: async ({ inquiryId }) => {
		const inquiry = await db.storefrontInquiry.findFirst({
			where: { id: inquiryId, status: { not: "DRAFT" } },
		});
		if (!inquiry)
			throw new Error(`Storefront inquiry ${inquiryId} was not found.`);
		const eligibleIds = await getUserIdsWithPermission(
			db,
			"viewStorefrontOrders",
		);
		const recipients =
			inquiry.assignedToId && eligibleIds.has(inquiry.assignedToId)
				? await db.users.findMany({
						where: {
							id: inquiry.assignedToId,
							deletedAt: null,
							accessRevokedAt: null,
						},
						select: { id: true, name: true, email: true },
					})
				: await db.users.findMany({
						where: {
							id: { in: [...eligibleIds] },
							deletedAt: null,
							accessRevokedAt: null,
						},
						orderBy: { id: "asc" },
						take: 10,
						select: { id: true, name: true, email: true },
					});
		const reference = inquiry.reference || inquiry.id;
		const projectSummary =
			stringArray(inquiry.projectTypes).join(", ") || "Custom millwork project";
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3010";
		const emailService = new EmailService(db);
		const jobs: Promise<unknown>[] = [
			emailService.sendTransactional({
				to: inquiry.email,
				subject: `We received your custom millwork request ${reference}`,
				template: "storefront-custom-inquiry-received",
				data: { name: inquiry.name, reference, projectSummary },
				idempotencyKey: `storefront-inquiry-${inquiry.id}-customer`,
			}),
		];
		const [author] = recipients;
		if (author) {
			const notificationLink = `/storefront/inquiries?inquiryId=${encodeURIComponent(inquiry.id)}`;
			const existingNotifications = await db.notifications.findMany({
				where: {
					type: "storefront_inquiry",
					link: notificationLink,
					userId: { in: recipients.map((user) => user.id) },
					deletedAt: null,
				},
				select: { userId: true },
			});
			const notifiedUserIds = new Set(
				existingNotifications.map((notification) => notification.userId),
			);
			const newNotificationRecipients = recipients.filter(
				(user) => !notifiedUserIds.has(user.id),
			);
			jobs.push(
				...(newNotificationRecipients.length
					? [
							db.notifications.createMany({
								data: newNotificationRecipients.map((user) => ({
									type: "storefront_inquiry",
									fromUserId: author.id,
									userId: user.id,
									message: `Custom request ${reference} from ${inquiry.name} is ready for review.`,
									alert: true,
									link: notificationLink,
									meta: {
										inquiryId: inquiry.id,
										reference,
										projectSummary,
									},
								})),
							}),
						]
					: []),
				...recipients
					.filter((user) => user.email)
					.map((user) =>
						emailService.sendTransactional({
							to: user.email,
							subject: `Review custom request ${reference}`,
							template: "dealer-program-status",
							data: {
								preview: "A custom millwork request is ready for review",
								heading: "New custom millwork request",
								recipientName: user.name,
								message: `${inquiry.name} submitted a ${projectSummary} request. Review the brief, attachments, and customer match before creating a quote.`,
								actionLabel: "Review request",
								actionUrl: `${appUrl}/storefront/inquiries?inquiryId=${encodeURIComponent(inquiry.id)}`,
							},
							idempotencyKey: `storefront-inquiry-${inquiry.id}-staff-${user.id}`,
						}),
					),
			);
		}
		const results = await Promise.allSettled(jobs);
		const failed = results.filter(
			(result) => result.status === "rejected",
		).length;
		await db.storefrontInquiryActivity.create({
			data: {
				inquiryId: inquiry.id,
				type: failed ? "notifications.partial_failure" : "notifications.sent",
				metadata: {
					attempted: jobs.length,
					failed,
					recipientCount: recipients.length,
				},
			},
		});
		logger.info("Storefront custom inquiry notifications completed", {
			inquiryId,
			attempted: jobs.length,
			failed,
		});
		return { inquiryId, attempted: jobs.length, failed };
	},
});

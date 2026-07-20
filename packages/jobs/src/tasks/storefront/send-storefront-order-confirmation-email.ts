import { db } from "@gnd/db";
import { EmailService } from "@gnd/notifications/services/email-service";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { z } from "zod";

const payloadSchema = z.object({
	email: z.string().email(),
	name: z.string().trim().min(1).max(255),
	orderId: z.string().trim().min(1).max(191),
});

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export const sendStorefrontOrderConfirmationEmail = schemaTask({
	id: "send-storefront-order-confirmation-email",
	schema: payloadSchema,
	maxDuration: 120,
	queue: { concurrencyLimit: 5 },
	run: async (payload) => {
		const order = await db.salesOrders.findFirst({
			where: {
				orderId: payload.orderId,
				salesChannel: "storefront",
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				createdAt: true,
				grandTotal: true,
				shippingAddress: {
					select: {
						address1: true,
						address2: true,
						city: true,
						state: true,
						meta: true,
					},
				},
				items: {
					where: { deletedAt: null },
					orderBy: { id: "asc" },
					select: {
						description: true,
						qty: true,
						price: true,
					},
				},
			},
		});
		if (!order) {
			throw new Error(`Storefront order ${payload.orderId} was not found.`);
		}
		const addressMeta = safeRecord(order.shippingAddress?.meta);
		await new EmailService(db).sendTransactional({
			to: payload.email,
			subject: `GND Millwork order ${order.orderId} confirmed`,
			template: "storefront-order-confirmation",
			data: {
				name: payload.name,
				orderId: order.orderId,
				orderDate: (order.createdAt || new Date()).toLocaleDateString("en-US"),
				shippingAddress: {
					street: [
						order.shippingAddress?.address1,
						order.shippingAddress?.address2,
					]
						.filter(Boolean)
						.join(", "),
					city: order.shippingAddress?.city || "",
					state: order.shippingAddress?.state || "",
					zip: String(addressMeta.zip_code || addressMeta.postalCode || ""),
				},
				items: order.items.map((item) => ({
					name: item.description || "Configured product",
					quantity: Number(item.qty || 0),
					price: Number(item.price || 0),
				})),
				total: Number(order.grandTotal || 0),
			},
		});
		logger.info("Storefront order confirmation email sent", {
			salesOrderId: order.id,
			orderId: order.orderId,
		});
		return { salesOrderId: order.id, sent: true };
	},
});

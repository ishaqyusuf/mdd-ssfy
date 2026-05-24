import type { Database, Prisma } from "..";
import { formatUSPhoneNumber } from "@gnd/utils/format";

export type DealerListInput = {
	search?: string | null;
	status?: string | null;
	take?: number | null;
};

export type DealerCustomerCandidateInput = {
	query?: string | null;
	take?: number | null;
};

export type CreateDealerAccountInput = {
	email: string;
	name?: string | null;
	customerId?: number | null;
	authorId: number;
};

export type ResendDealerOnboardingInput = {
	dealerId: number;
	authorId: number;
};

export type CompleteDealerOnboardingInput = {
	token: string;
	authUserId: string;
};

export type DealerCustomerFormInput = {
	id?: number | null;
	name?: string | null;
	businessName?: string | null;
	email?: string | null;
	phoneNo?: string | null;
	address?: string | null;
	formattedAddress?: string | null;
	address1?: string | null;
	address2?: string | null;
	city?: string | null;
	state?: string | null;
	zip_code?: string | null;
	country?: string | null;
	lat?: number | null;
	lng?: number | null;
	customerTypeId?: number | null;
};

export type DealerSalesProfileFormInput = {
	id?: number | null;
	title: string;
	salesPercentage?: number | null;
	defaultProfile?: boolean | null;
};

export type DealerSettingsFormInput = {
	name?: string | null;
	companyName?: string | null;
	phoneNo?: string | null;
	logoUrl?: string | null;
	address1?: string | null;
	address2?: string | null;
	city?: string | null;
	state?: string | null;
	country?: string | null;
};

export type DealerPortalQuoteLineItemInput = {
	uid: string;
	title?: string | null;
	description?: string | null;
	qty?: number | null;
	unitPrice?: number | null;
	lineTotal?: number | null;
	meta?: Record<string, unknown> | null;
	formSteps?: Record<string, unknown>[] | null;
	shelfItems?: Record<string, unknown>[] | null;
	housePackageTool?: Record<string, unknown> | null;
};

export type DealerPortalSaveQuoteInput = {
	id?: number | null;
	customerId: number;
	customerProfileId?: number | null;
	po?: string | null;
	paymentTerm?: string | null;
	goodUntil?: string | null;
	deliveryOption?: string | null;
	paymentMethod?: string | null;
	taxCode?: string | null;
	taxRate?: number | null;
	lineItems: DealerPortalQuoteLineItemInput[];
};

export type DealerPortalSalesListInput = {
	cursor?: number | null;
	size?: number | null;
	q?: string | null;
	"customer.name"?: string | null;
	phone?: string | null;
	orderNo?: string | null;
	status?: string | null;
	deliveryOption?: string | null;
	customerProfileId?: string | null;
	amountDue?: "due" | "paid" | "credit" | null;
	invoiceStatus?: string | null;
	paymentStatus?: "due" | "paid" | "credit" | null;
};

function getObjectMeta(meta: unknown): Record<string, unknown> {
	return meta && typeof meta === "object" && !Array.isArray(meta)
		? (meta as Record<string, unknown>)
		: {};
}

function getDealerCustomerAddressMeta(meta: unknown) {
	const objectMeta = getObjectMeta(meta);
	const address =
		objectMeta.dealerAddress &&
		typeof objectMeta.dealerAddress === "object" &&
		!Array.isArray(objectMeta.dealerAddress)
			? (objectMeta.dealerAddress as Record<string, unknown>)
			: {};

	return {
		formattedAddress:
			typeof address.formattedAddress === "string"
				? address.formattedAddress
				: null,
		address1: typeof address.address1 === "string" ? address.address1 : null,
		address2: typeof address.address2 === "string" ? address.address2 : null,
		city: typeof address.city === "string" ? address.city : null,
		state: typeof address.state === "string" ? address.state : null,
		zip_code: typeof address.zip_code === "string" ? address.zip_code : null,
		country: typeof address.country === "string" ? address.country : null,
		lat: typeof address.lat === "number" ? address.lat : null,
		lng: typeof address.lng === "number" ? address.lng : null,
	};
}

function buildDealerAddressMeta(input: DealerCustomerFormInput) {
	return {
		formattedAddress:
			input.formattedAddress?.trim() || input.address?.trim() || null,
		address1: input.address1?.trim() || null,
		address2: input.address2?.trim() || null,
		city: input.city?.trim() || null,
		state: input.state?.trim() || null,
		zip_code: input.zip_code?.trim() || null,
		country: input.country?.trim() || null,
		lat: input.lat ?? null,
		lng: input.lng ?? null,
	};
}

export type DealerPortalCustomersListInput = {
	cursor?: number | null;
	size?: number | null;
	q?: string | null;
	"customer.name"?: string | null;
	phone?: string | null;
	profile?: string | null;
};

function dealerSearchWhere(
	search?: string | null,
): Prisma.DealerAuthWhereInput {
	const value = search?.trim();

	if (!value) return {};

	return {
		OR: [
			{ email: { contains: value } },
			{ name: { contains: value } },
			{ companyName: { contains: value } },
			{
				dealer: {
					OR: [
						{ name: { contains: value } },
						{ businessName: { contains: value } },
						{ email: { contains: value } },
						{ phoneNo: { contains: value } },
					],
				},
			},
		],
	};
}

export async function getDealers(db: Database, input: DealerListInput = {}) {
	return db.dealerAuth.findMany({
		where: {
			...dealerSearchWhere(input.search),
			status: input.status || undefined,
		},
		orderBy: {
			createdAt: "desc",
		},
		take: input.take || 50,
		select: {
			id: true,
			email: true,
			name: true,
			companyName: true,
			phoneNo: true,
			status: true,
			approvedAt: true,
			restricted: true,
			createdAt: true,
			authUserId: true,
			dealer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
					phoneNo: true,
				},
			},
		},
	});
}

export async function searchDealerCustomerCandidates(
	db: Database,
	input: DealerCustomerCandidateInput = {},
) {
	const query = input.query?.trim();

	return db.customers.findMany({
		where: query
			? {
					OR: [
						{ name: { contains: query } },
						{ businessName: { contains: query } },
						{ email: { contains: query } },
						{ phoneNo: { contains: query } },
					],
				}
			: {},
		orderBy: {
			createdAt: "desc",
		},
		take: input.take || 10,
		select: {
			id: true,
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			createdAt: true,
			auth: {
				select: {
					id: true,
					status: true,
				},
			},
		},
	});
}

export async function createDealerAccount(
	db: Database,
	input: CreateDealerAccountInput,
) {
	const email = input.email.trim().toLowerCase();
	const name = input.name?.trim() || null;
	const token = crypto.randomUUID();
	const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

	return db.$transaction(async (tx) => {
		const customer = input.customerId
			? await tx.customers.findFirst({
					where: {
						id: input.customerId,
						deletedAt: null,
					},
					select: {
						id: true,
						name: true,
						businessName: true,
						email: true,
					},
				})
			: null;

		const existing = await tx.dealerAuth.findUnique({
			where: {
				email,
			},
			select: {
				id: true,
			},
		});

		const dealer = existing
			? await tx.dealerAuth.update({
					where: {
						id: existing.id,
					},
					data: {
						dealerId: input.customerId || undefined,
						name: name || customer?.businessName || customer?.name || null,
						status: "pending",
					},
				})
			: await tx.dealerAuth.create({
					data: {
						email,
						dealerId: input.customerId || undefined,
						name: name || customer?.businessName || customer?.name || null,
						status: "pending",
					},
				});

		const invite = await tx.dealerToken.create({
			data: {
				dealerId: dealer.id,
				token,
				expiredAt,
			},
		});

		await tx.dealerStatusHistory.create({
			data: {
				dealerId: dealer.id,
				status: "pending",
				authorId: input.authorId,
				reason: "Dealer onboarding guide sent.",
			},
		});

		const addressRecipient = input.customerId
			? null
			: await tx.addressBooks.create({
					data: {
						name: name || email,
						email,
						meta: {
							source: "dealer_onboarding",
							dealerId: dealer.id,
						},
					},
					select: {
						id: true,
					},
				});

		return {
			dealer,
			invite,
			notificationRecipient: input.customerId
				? ({
						role: "customer" as const,
						id: input.customerId,
					} as const)
				: ({
						role: "address" as const,
						id: addressRecipient!.id,
					} as const),
		};
	});
}

export async function resendDealerOnboardingInvite(
	db: Database,
	input: ResendDealerOnboardingInput,
) {
	const token = crypto.randomUUID();
	const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

	return db.$transaction(async (tx) => {
		const dealer = await tx.dealerAuth.findFirst({
			where: {
				id: input.dealerId,
				deletedAt: null,
			},
			select: {
				id: true,
				email: true,
				name: true,
				companyName: true,
				dealerId: true,
				authUserId: true,
			},
		});

		if (!dealer) {
			throw new Error("Dealer account could not be found.");
		}

		if (dealer.authUserId) {
			throw new Error("Dealer onboarding is already complete.");
		}

		await tx.dealerToken.updateMany({
			where: {
				dealerId: dealer.id,
				consumedAt: null,
			},
			data: {
				consumedAt: new Date(),
			},
		});

		const invite = await tx.dealerToken.create({
			data: {
				dealerId: dealer.id,
				token,
				expiredAt,
			},
		});

		await tx.dealerStatusHistory.create({
			data: {
				dealerId: dealer.id,
				status: "pending",
				authorId: input.authorId,
				reason: "Dealer onboarding guide resent.",
			},
		});

		const addressRecipient = dealer.dealerId
			? null
			: await tx.addressBooks.create({
					data: {
						name: dealer.companyName || dealer.name || dealer.email,
						email: dealer.email,
						meta: {
							source: "dealer_onboarding_resend",
							dealerId: dealer.id,
						},
					},
					select: {
						id: true,
					},
				});

		return {
			dealer,
			invite,
			notificationRecipient: dealer.dealerId
				? ({
						role: "customer" as const,
						id: dealer.dealerId,
					} as const)
				: ({
						role: "address" as const,
						id: addressRecipient!.id,
					} as const),
		};
	});
}

export async function getDealerOnboardingInvite(db: Database, token: string) {
	return db.dealerToken.findFirst({
		where: {
			token,
			consumedAt: null,
			expiredAt: {
				gt: new Date(),
			},
		},
		select: {
			token: true,
			expiredAt: true,
			auth: {
				select: {
					id: true,
					email: true,
					name: true,
					companyName: true,
					status: true,
					authUserId: true,
				},
			},
		},
	});
}

export async function getDealerByAuthUserId(db: Database, authUserId: string) {
	return db.dealerAuth.findUnique({
		where: {
			authUserId,
		},
		select: {
			id: true,
			email: true,
			name: true,
			companyName: true,
			phoneNo: true,
			status: true,
			restricted: true,
			deletedAt: true,
			authUserId: true,
			dealer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
					phoneNo: true,
				},
			},
		},
	});
}

export async function getActiveDealerByAuthUserId(
	db: Database,
	authUserId: string,
) {
	const dealer = await getDealerByAuthUserId(db, authUserId);

	if (!dealer || dealer.deletedAt || dealer.restricted) {
		return null;
	}

	return dealer.status === "active" || dealer.status === "approved"
		? dealer
		: null;
}

export async function getDealerPortalDashboard(db: Database, dealerId: number) {
	const [openQuotes, activeOrders, customers, salesProfiles] =
		await Promise.all([
			db.salesOrders.count({
				where: {
					dealerAuthId: dealerId,
					deletedAt: null,
					type: "quote",
				},
			}),
			db.salesOrders.count({
				where: {
					dealerAuthId: dealerId,
					deletedAt: null,
					type: {
						not: "quote",
					},
				},
			}),
			db.customers.count({
				where: {
					dealerOwnerId: dealerId,
					deletedAt: null,
				},
			}),
			db.customerTypes.count({
				where: {
					dealerOwnerId: dealerId,
					deletedAt: null,
				},
			}),
		]);

	return {
		openQuotes,
		activeOrders,
		customers,
		salesProfiles,
	};
}

export async function getDealerPortalCustomers(db: Database, dealerId: number) {
	return db.customers.findMany({
		where: {
			dealerOwnerId: dealerId,
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 100,
		select: {
			id: true,
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			address: true,
			meta: true,
			customerTypeId: true,
			createdAt: true,
			profile: {
				select: {
					id: true,
					title: true,
					salesPercentage: true,
				},
			},
		},
	});
}

export async function getDealerPortalCustomer(
	db: Database,
	dealerId: number,
	id: number,
) {
	const customer = await db.customers.findFirst({
		where: {
			id,
			dealerOwnerId: dealerId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			email: true,
			phoneNo: true,
			address: true,
			meta: true,
			customerTypeId: true,
		},
	});

	if (!customer) {
		throw new Error("Dealer customer could not be found.");
	}

	return {
		...customer,
		...getDealerCustomerAddressMeta(customer.meta),
	};
}

function getDealerSalesListWhere(
	dealerId: number,
	type: "order" | "quote",
	input: DealerPortalSalesListInput = {},
): Prisma.SalesOrdersWhereInput {
	const search = input.q?.trim();
	const customerName = input["customer.name"]?.trim();
	const phone = input.phone?.trim();
	const orderNo = input.orderNo?.trim();
	const status = input.status?.trim();
	const deliveryOption = input.deliveryOption?.trim();
	const customerProfileId = Number(input.customerProfileId || 0) || null;
	const invoiceStatus = input.invoiceStatus?.trim();
	const paymentStatus = input.paymentStatus || input.amountDue || null;
	const customerSearch = customerName || undefined;
	const phoneSearch = phone ? formatUSPhoneNumber(phone) : undefined;
	const searchPhone = search ? formatUSPhoneNumber(search) : undefined;

	return {
		dealerAuthId: dealerId,
		deletedAt: null,
		type: type === "quote" ? "quote" : { not: "quote" },
		...(orderNo
			? {
					orderId: {
						contains: orderNo,
					},
				}
			: {}),
		...(status
			? {
					status,
				}
			: {}),
		...(deliveryOption
			? {
					deliveryOption,
				}
			: {}),
		...(customerProfileId
			? {
					dealerSalesProfileId: customerProfileId,
				}
			: {}),
		...(invoiceStatus
			? {
					invoiceStatus,
				}
			: {}),
		...(paymentStatus === "due"
			? {
					amountDue: {
						gt: 0,
					},
				}
			: {}),
		...(paymentStatus === "paid"
			? {
					amountDue: 0,
				}
			: {}),
		...(paymentStatus === "credit"
			? {
					amountDue: {
						lt: 0,
					},
				}
			: {}),
		...(customerSearch || phoneSearch
			? {
					customer: {
						is: {
							...(customerSearch
								? {
										OR: [
											{ name: { contains: customerSearch } },
											{ businessName: { contains: customerSearch } },
											{ email: { contains: customerSearch } },
										],
									}
								: {}),
							...(phoneSearch
								? {
										phoneNo: { contains: phoneSearch },
									}
								: {}),
						},
					},
				}
			: {}),
		...(search
			? {
					OR: [
						{ orderId: { contains: search } },
						{ title: { contains: search } },
						{ status: { contains: search } },
						{
							customer: {
								is: {
									OR: [
										{ name: { contains: search } },
										{ businessName: { contains: search } },
										{ email: { contains: search } },
										{ phoneNo: { contains: search } },
										...(searchPhone && searchPhone !== search
											? [{ phoneNo: { contains: searchPhone } }]
											: []),
									],
								},
							},
						},
					],
				}
			: {}),
	};
}

function mapDealerSalesDocument(document: {
	id: number;
	orderId: string;
	title: string | null;
	status: string | null;
	type: string | null;
	grandTotal: number | null;
	amountDue: number | null;
	meta: Prisma.JsonValue | null;
	invoiceStatus: string | null;
	createdAt: Date | null;
	customer: {
		id: number;
		name: string | null;
		businessName: string | null;
		email: string | null;
		phoneNo?: string | null;
	} | null;
}) {
	const dealerSummary = getDealerPricingSummaryFromMeta(document.meta);
	const { meta: _meta, ...safeDocument } = document;
	return {
		...safeDocument,
		grandTotal: Number(dealerSummary?.grandTotal ?? document.grandTotal ?? 0),
		amountDue: Number(dealerSummary?.grandTotal ?? document.amountDue ?? 0),
	};
}

export async function getDealerPortalSalesList(
	db: Database,
	dealerId: number,
	type: "order" | "quote",
	input: DealerPortalSalesListInput = {},
) {
	const size = Math.min(Math.max(Number(input.size || 25), 1), 100);
	const cursor = Number(input.cursor || 0);
	const where = getDealerSalesListWhere(dealerId, type, input);
	const [documents, count] = await Promise.all([
		db.salesOrders.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			skip: cursor,
			take: size,
			select: {
				id: true,
				orderId: true,
				title: true,
				status: true,
				type: true,
				grandTotal: true,
				amountDue: true,
				meta: true,
				invoiceStatus: true,
				createdAt: true,
				customer: {
					select: {
						id: true,
						name: true,
						businessName: true,
						email: true,
						phoneNo: true,
					},
				},
			},
		}),
		db.salesOrders.count({ where }),
	]);
	const nextCursor = cursor + documents.length;

	return {
		data: documents.map(mapDealerSalesDocument),
		meta: {
			cursor: nextCursor < count ? nextCursor : null,
			count,
			size,
		},
	};
}

function getDealerCustomersListWhere(
	dealerId: number,
	input: DealerPortalCustomersListInput = {},
): Prisma.CustomersWhereInput {
	const search = input.q?.trim();
	const customerName = input["customer.name"]?.trim();
	const phone = input.phone ? formatUSPhoneNumber(input.phone) : undefined;
	const profile = input.profile?.trim();
	const searchPhone = search ? formatUSPhoneNumber(search) : undefined;

	return {
		dealerOwnerId: dealerId,
		deletedAt: null,
		...(customerName
			? {
					OR: [
						{ name: { contains: customerName } },
						{ businessName: { contains: customerName } },
						{ email: { contains: customerName } },
					],
				}
			: {}),
		...(phone
			? {
					phoneNo: { contains: phone },
				}
			: {}),
		...(profile
			? {
					profile: {
						is: {
							title: { contains: profile },
						},
					},
				}
			: {}),
		...(search
			? {
					OR: [
						{ name: { contains: search } },
						{ businessName: { contains: search } },
						{ email: { contains: search } },
						{ phoneNo: { contains: search } },
						...(searchPhone && searchPhone !== search
							? [{ phoneNo: { contains: searchPhone } }]
							: []),
						{ address: { contains: search } },
					],
				}
			: {}),
	};
}

export async function getDealerPortalCustomersList(
	db: Database,
	dealerId: number,
	input: DealerPortalCustomersListInput = {},
) {
	const size = Math.min(Math.max(Number(input.size || 25), 1), 100);
	const cursor = Number(input.cursor || 0);
	const where = getDealerCustomersListWhere(dealerId, input);
	const [customers, count] = await Promise.all([
		db.customers.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			skip: cursor,
			take: size,
			select: {
				id: true,
				name: true,
				businessName: true,
				email: true,
				phoneNo: true,
				address: true,
				meta: true,
				customerTypeId: true,
				createdAt: true,
				profile: {
					select: {
						id: true,
						title: true,
						salesPercentage: true,
					},
				},
			},
		}),
		db.customers.count({ where }),
	]);
	const nextCursor = cursor + customers.length;

	return {
		data: customers,
		meta: {
			cursor: nextCursor < count ? nextCursor : null,
			count,
			size,
		},
	};
}

export async function saveDealerPortalCustomer(
	db: Database,
	dealerId: number,
	input: DealerCustomerFormInput,
) {
	const customerTypeId = input.customerTypeId || null;

	if (customerTypeId) {
		const profile = await db.customerTypes.findFirst({
			where: {
				id: customerTypeId,
				dealerOwnerId: dealerId,
				deletedAt: null,
			},
			select: {
				id: true,
			},
		});

		if (!profile) {
			throw new Error("Dealer sales profile could not be found.");
		}
	}

	const addressMeta = buildDealerAddressMeta(input);
	const displayAddress =
		addressMeta.formattedAddress ||
		[
			addressMeta.address1,
			addressMeta.city,
			addressMeta.state,
			addressMeta.zip_code,
		]
			.filter(Boolean)
			.join(", ");

	const baseData = {
		name: input.name?.trim() || null,
		businessName: input.businessName?.trim() || null,
		email: input.email?.trim().toLowerCase() || null,
		phoneNo: input.phoneNo?.trim() || null,
		address: displayAddress || null,
		customerTypeId,
		dealerOwnerId: dealerId,
	};

	if (input.id) {
		const existing = await db.customers.findFirst({
			where: {
				id: input.id,
				dealerOwnerId: dealerId,
				deletedAt: null,
			},
			select: {
				id: true,
				meta: true,
			},
		});

		if (!existing) {
			throw new Error("Dealer customer could not be found.");
		}

		return db.customers.update({
			where: {
				id: input.id,
			},
			data: {
				...baseData,
				meta: {
					...getObjectMeta(existing.meta),
					dealerAddress: addressMeta,
				},
			},
		});
	}

	return db.customers.create({
		data: {
			...baseData,
			meta: {
				dealerAddress: addressMeta,
			},
		},
	});
}

export async function getDealerPortalSalesProfiles(
	db: Database,
	dealerId: number,
) {
	return db.customerTypes.findMany({
		where: {
			dealerOwnerId: dealerId,
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			title: true,
			salesPercentage: true,
			defaultProfile: true,
			createdAt: true,
			_count: {
				select: {
					customers: true,
				},
			},
		},
	});
}

export async function getDealerPortalInternalSalesProfile(
	db: Pick<Database, "customerTypes">,
) {
	return db.customerTypes.findFirst({
		where: {
			dealerOwnerId: null,
			deletedAt: null,
		},
		orderBy: [{ defaultProfile: "desc" }, { id: "asc" }],
		select: {
			id: true,
			title: true,
			coefficient: true,
		},
	});
}

export async function saveDealerPortalSalesProfile(
	db: Database,
	dealerId: number,
	input: DealerSalesProfileFormInput,
) {
	const data = {
		title: input.title.trim(),
		salesPercentage: input.salesPercentage ?? null,
		defaultProfile: input.defaultProfile ?? false,
		dealerOwnerId: dealerId,
	};

	if (input.id) {
		const existing = await db.customerTypes.findFirst({
			where: {
				id: input.id,
				dealerOwnerId: dealerId,
				deletedAt: null,
			},
			select: {
				id: true,
			},
		});

		if (!existing) {
			throw new Error("Dealer sales profile could not be found.");
		}

		return db.customerTypes.update({
			where: {
				id: input.id,
			},
			data,
		});
	}

	return db.customerTypes.create({
		data,
	});
}

export async function getDealerPortalSalesDocuments(
	db: Database,
	dealerId: number,
	type: "order" | "quote",
) {
	const documents = await db.salesOrders.findMany({
		where: {
			dealerAuthId: dealerId,
			deletedAt: null,
			type: type === "quote" ? "quote" : { not: "quote" },
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 100,
		select: {
			id: true,
			orderId: true,
			title: true,
			status: true,
			type: true,
			grandTotal: true,
			amountDue: true,
			meta: true,
			invoiceStatus: true,
			createdAt: true,
			customer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
				},
			},
		},
	});
	return documents.map((document) => {
		const dealerSummary = getDealerPricingSummaryFromMeta(document.meta);
		const { meta: _meta, ...safeDocument } = document;
		return {
			...safeDocument,
			grandTotal: Number(dealerSummary?.grandTotal ?? document.grandTotal ?? 0),
			amountDue: Number(dealerSummary?.grandTotal ?? document.amountDue ?? 0),
		};
	});
}

function getDealerNewSalesFormMeta(meta: Prisma.JsonValue | null | undefined) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
	const value = (meta as Record<string, unknown>).newSalesForm;
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function getDealerPricingSummaryFromMeta(
	meta: Prisma.JsonValue | null | undefined,
) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
	const dealerPricing = (meta as Record<string, unknown>).dealerPricing;
	if (
		!dealerPricing ||
		typeof dealerPricing !== "object" ||
		Array.isArray(dealerPricing)
	) {
		return null;
	}
	const summary = (dealerPricing as Record<string, unknown>).summary;
	return summary && typeof summary === "object" && !Array.isArray(summary)
		? (summary as Record<string, unknown>)
		: null;
}

export async function getDealerPortalSalesDocument(
	db: Database,
	dealerId: number,
	id: number,
) {
	const document = await db.salesOrders.findFirst({
		where: {
			id,
			dealerAuthId: dealerId,
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
			title: true,
			status: true,
			type: true,
			grandTotal: true,
			amountDue: true,
			taxPercentage: true,
			customerId: true,
			customerProfileId: true,
			dealerSalesProfileId: true,
			meta: true,
			customer: {
				select: {
					id: true,
					name: true,
					businessName: true,
					email: true,
					customerTypeId: true,
				},
			},
			items: {
				orderBy: {
					id: "asc",
				},
				select: {
					id: true,
					description: true,
					dykeDescription: true,
					qty: true,
					rate: true,
					total: true,
					meta: true,
				},
			},
		},
	});

	if (!document) {
		throw new Error("Dealer sales document could not be found.");
	}

	const newSalesForm = getDealerNewSalesFormMeta(document.meta);
	const form =
		newSalesForm?.form &&
		typeof newSalesForm.form === "object" &&
		!Array.isArray(newSalesForm.form)
			? (newSalesForm.form as Record<string, unknown>)
			: null;
	const metaLineItems = Array.isArray(newSalesForm?.lineItems)
		? newSalesForm.lineItems
		: null;
	const dealerSummary = getDealerPricingSummaryFromMeta(document.meta);
	const { meta: _meta, items, ...safeDocument } = document;

	return {
		...safeDocument,
		grandTotal: Number(dealerSummary?.grandTotal ?? document.grandTotal ?? 0),
		amountDue: Number(dealerSummary?.grandTotal ?? document.amountDue ?? 0),
		customerId:
			Number(
				form?.customerId || document.customerId || document.customer?.id || 0,
			) || null,
		customerProfileId:
			Number(
				form?.customerProfileId ||
					document.dealerSalesProfileId ||
					document.customer?.customerTypeId ||
					0,
			) || null,
		taxRate: Number(
			(newSalesForm?.summary as Record<string, unknown> | undefined)?.taxRate ??
				document.taxPercentage ??
				0,
		),
		po: typeof form?.po === "string" ? form.po : null,
		paymentTerm:
			typeof form?.paymentTerm === "string" ? form.paymentTerm : "None",
		goodUntil: typeof form?.goodUntil === "string" ? form.goodUntil : null,
		deliveryOption:
			typeof form?.deliveryOption === "string" ? form.deliveryOption : "pickup",
		paymentMethod:
			typeof form?.paymentMethod === "string" ? form.paymentMethod : null,
		taxCode: typeof form?.taxCode === "string" ? form.taxCode : null,
		lineItems: metaLineItems?.length
			? metaLineItems
			: items.map((item) => {
					const itemMeta =
						item.meta &&
						typeof item.meta === "object" &&
						!Array.isArray(item.meta)
							? (item.meta as Record<string, unknown>)
							: {};
					return {
						uid: String(itemMeta.uid || `dealer-item-${item.id}`),
						title:
							typeof itemMeta.title === "string"
								? itemMeta.title
								: item.dykeDescription || item.description || "",
						description: item.description || "",
						qty: Number(item.qty || 0),
						unitPrice: Number(itemMeta.dealerUnitPrice ?? item.rate ?? 0),
						lineTotal: Number(itemMeta.dealerLineTotal ?? item.total ?? 0),
					};
				}),
	};
}

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pricingCoefficient(profile?: { coefficient?: number | null } | null) {
	const value = Number(profile?.coefficient ?? 1);
	return Number.isFinite(value) && value > 0 ? value : 1;
}

function pricingPercentage(
	profile?: { salesPercentage?: number | null } | null,
) {
	const value = Number(profile?.salesPercentage ?? 0);
	return Number.isFinite(value) ? value : 0;
}

function baseUnitPriceFromDealerLine(line: DealerPortalQuoteLineItemInput) {
	const explicitUnitPrice = Number(line.unitPrice ?? 0);
	if (Number.isFinite(explicitUnitPrice) && explicitUnitPrice > 0) {
		return explicitUnitPrice;
	}

	const qty = Number(line.qty ?? 0);
	const lineTotal = Number(line.lineTotal ?? 0);
	if (Number.isFinite(qty) && qty > 0 && Number.isFinite(lineTotal)) {
		return roundCurrency(lineTotal / qty);
	}

	return Number.isFinite(explicitUnitPrice) ? explicitUnitPrice : 0;
}

function dealerLineMeta(line: DealerPortalQuoteLineItemInput) {
	return line.meta && typeof line.meta === "object" && !Array.isArray(line.meta)
		? (line.meta as Record<string, unknown>)
		: {};
}

function dealerLineServiceRows(line: DealerPortalQuoteLineItemInput) {
	const rows = dealerLineMeta(line).serviceRows;
	return Array.isArray(rows)
		? rows.filter(
				(row): row is Record<string, unknown> =>
					Boolean(row) && typeof row === "object" && !Array.isArray(row),
			)
		: [];
}

function dealerLineIsTaxable(line: DealerPortalQuoteLineItemInput) {
	const meta = dealerLineMeta(line);
	if (typeof meta.taxxable === "boolean") return meta.taxxable;
	if (typeof meta.tax === "boolean") return meta.tax;
	return dealerLineServiceRows(line).some((row) => row.taxxable === true);
}

function dealerLineIsProduceable(line: DealerPortalQuoteLineItemInput) {
	const meta = dealerLineMeta(line);
	if (typeof meta.produceable === "boolean") return meta.produceable;
	return dealerLineServiceRows(line).some((row) => row.produceable === true);
}

type DealerQuoteVisibilitySettings = {
	hiddenRootUids: Set<string>;
	shelfCategoryVisibility: {
		mode: "all" | "allowlist";
		categoryIds: Set<number>;
	};
};

function numberFromUnknown(value: unknown) {
	const numeric = Number(value);
	return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function stringFromUnknown(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberSetFromUnknown(value: unknown) {
	const ids = Array.isArray(value) ? value : [];
	return new Set(
		ids
			.map((entry) => numberFromUnknown(entry))
			.filter((entry): entry is number => entry != null),
	);
}

function getDealerShelfVisibilityFromSettings(
	meta: unknown,
): DealerQuoteVisibilitySettings["shelfCategoryVisibility"] {
	const settingsMeta = getObjectMeta(meta);
	const nestedSettingsMeta = getObjectMeta(settingsMeta.data);
	const rawVisibility = getObjectMeta(
		Object.keys(getObjectMeta(settingsMeta.dealerShelfCategoryVisibility))
			.length
			? settingsMeta.dealerShelfCategoryVisibility
			: nestedSettingsMeta.dealerShelfCategoryVisibility,
	);
	const mode: "all" | "allowlist" =
		rawVisibility.mode === "allowlist" ? "allowlist" : "all";
	return {
		mode,
		categoryIds:
			mode === "allowlist"
				? numberSetFromUnknown(rawVisibility.categoryIds)
				: new Set<number>(),
	};
}

async function getDealerQuoteVisibilitySettings(
	tx: any,
): Promise<DealerQuoteVisibilitySettings> {
	const setting = tx.settings?.findFirst
		? await tx.settings.findFirst({
				where: {
					type: "sales-settings",
				},
				select: {
					meta: true,
				},
			})
		: null;
	const settingsMeta = getObjectMeta(setting?.meta);
	const nestedSettingsMeta = getObjectMeta(settingsMeta.data);
	const rawRoute = getObjectMeta(
		Object.keys(getObjectMeta(settingsMeta.route)).length
			? settingsMeta.route
			: nestedSettingsMeta.route,
	);
	const hiddenRootUids = new Set<string>();

	for (const [rootUid, routeDef] of Object.entries(rawRoute)) {
		const config = getObjectMeta(getObjectMeta(routeDef).config);
		if (config.dealerVisible === false) {
			hiddenRootUids.add(rootUid);
		}
	}

	return {
		hiddenRootUids,
		shelfCategoryVisibility: getDealerShelfVisibilityFromSettings(settingsMeta),
	};
}

function lineUsesHiddenDealerRoot(
	line: DealerPortalQuoteLineItemInput,
	hiddenRootUids: Set<string>,
) {
	if (!hiddenRootUids.size) return false;
	const meta = getObjectMeta(line.meta);
	const candidateUids = [
		stringFromUnknown(meta.itemTypeUid),
		stringFromUnknown(meta.rootUid),
		...(Array.isArray(line.formSteps) ? line.formSteps : []).map((step) => {
			const stepMeta = getObjectMeta(step);
			return (
				stringFromUnknown(stepMeta.prodUid) ||
				stringFromUnknown(stepMeta.productUid) ||
				stringFromUnknown(stepMeta.uid)
			);
		}),
	].filter((uid): uid is string => !!uid);

	return candidateUids.some((uid) => hiddenRootUids.has(uid));
}

async function getShelfProductsById(
	tx: any,
	productIds: number[],
): Promise<
	Map<number, { categoryId: number | null; parentCategoryId: number | null }>
> {
	if (!productIds.length || !tx.dykeShelfProducts?.findMany) {
		return new Map<
			number,
			{ categoryId: number | null; parentCategoryId: number | null }
		>();
	}
	const products = await tx.dykeShelfProducts.findMany({
		where: {
			id: {
				in: Array.from(new Set(productIds)),
			},
			deletedAt: null,
		},
		select: {
			id: true,
			categoryId: true,
			parentCategoryId: true,
		},
	});
	return new Map<
		number,
		{ categoryId: number | null; parentCategoryId: number | null }
	>(
		products.map(
			(product: {
				id: number;
				categoryId: number | null;
				parentCategoryId: number | null;
			}) =>
				[
					product.id,
					{
						categoryId: product.categoryId,
						parentCategoryId: product.parentCategoryId,
					},
				] as const,
		),
	);
}

function shelfItemAllowedByCategory(
	shelfItem: Record<string, unknown>,
	product: {
		categoryId: number | null;
		parentCategoryId: number | null;
	} | null,
	allowedCategoryIds: Set<number>,
) {
	const meta = getObjectMeta(shelfItem.meta);
	const candidateCategoryIds = [
		numberFromUnknown(shelfItem.categoryId),
		numberFromUnknown(shelfItem.parentCategoryId),
		numberFromUnknown(meta.categoryId),
		numberFromUnknown(meta.parentCategoryId),
		numberFromUnknown(meta.shelfCategoryId),
		numberFromUnknown(meta.shelfParentCategoryId),
		product?.categoryId ?? null,
		product?.parentCategoryId ?? null,
	].filter((id): id is number => id != null);
	return candidateCategoryIds.some((id) => allowedCategoryIds.has(id));
}

async function validateDealerPortalQuoteVisibility(
	tx: any,
	lineItems: DealerPortalQuoteLineItemInput[],
) {
	const visibility = await getDealerQuoteVisibilitySettings(tx);
	for (const line of lineItems) {
		if (lineUsesHiddenDealerRoot(line, visibility.hiddenRootUids)) {
			throw new Error("This item type is not available in the dealer portal.");
		}
	}

	if (visibility.shelfCategoryVisibility.mode !== "allowlist") return;

	const allowedCategoryIds = visibility.shelfCategoryVisibility.categoryIds;
	const shelfItems = lineItems.flatMap((line) =>
		Array.isArray(line.shelfItems) ? line.shelfItems : [],
	);
	const shelfProductIds = shelfItems
		.map((item) => numberFromUnknown(getObjectMeta(item).productId))
		.filter((id): id is number => id != null);
	const productsById = await getShelfProductsById(tx, shelfProductIds);

	for (const item of shelfItems) {
		const shelfItem = getObjectMeta(item);
		const productId = numberFromUnknown(shelfItem.productId);
		const product = productId ? productsById.get(productId) || null : null;
		if (!shelfItemAllowedByCategory(shelfItem, product, allowedCategoryIds)) {
			throw new Error("This shelf item is not available in the dealer portal.");
		}
	}
}

export function calculateDealerQuotePricing({
	lineItems,
	taxRate,
	internalProfile,
	dealerProfile,
	createdAt,
}: {
	lineItems: DealerPortalQuoteLineItemInput[];
	taxRate: number;
	internalProfile?: {
		id?: number | null;
		title?: string | null;
		coefficient?: number | null;
	} | null;
	dealerProfile?: {
		id?: number | null;
		title?: string | null;
		salesPercentage?: number | null;
	} | null;
	createdAt?: string | Date | null;
}) {
	const internalCoefficient = pricingCoefficient(internalProfile);
	const dealerSalesPercentage = pricingPercentage(dealerProfile);
	const dealerMultiplier = 1 + dealerSalesPercentage / 100;
	const snapshotCreatedAt =
		createdAt instanceof Date
			? createdAt.toISOString()
			: createdAt || new Date().toISOString();

	const lines = lineItems.map((line) => {
		const qty = Number(line.qty ?? 0);
		const baseUnitPrice = baseUnitPriceFromDealerLine(line);
		const internalUnitPrice = roundCurrency(
			baseUnitPrice * internalCoefficient,
		);
		const dealerUnitPrice = roundCurrency(internalUnitPrice * dealerMultiplier);

		return {
			uid: line.uid,
			title: line.title?.trim() || null,
			description: line.description?.trim() || "",
			qty,
			internalUnitPrice,
			internalLineTotal: roundCurrency(qty * internalUnitPrice),
			dealerUnitPrice,
			dealerLineTotal: roundCurrency(qty * dealerUnitPrice),
		};
	});

	const internalSubTotal = roundCurrency(
		lines.reduce((sum, line) => sum + line.internalLineTotal, 0),
	);
	const dealerSubTotal = roundCurrency(
		lines.reduce((sum, line) => sum + line.dealerLineTotal, 0),
	);
	const internalTaxTotal = roundCurrency(internalSubTotal * (taxRate / 100));
	const dealerTaxTotal = roundCurrency(dealerSubTotal * (taxRate / 100));

	return {
		source: "dealer_portal_dual_pricing",
		createdAt: snapshotCreatedAt,
		internalProfileId: internalProfile?.id ?? null,
		dealerProfileId: dealerProfile?.id ?? null,
		profiles: {
			internal: {
				id: internalProfile?.id ?? null,
				label: internalProfile?.title ?? null,
				coefficient: internalCoefficient,
			},
			dealer: {
				id: dealerProfile?.id ?? null,
				label: dealerProfile?.title ?? null,
				salesPercentage: dealerSalesPercentage,
			},
		},
		lines,
		internalPricing: {
			subTotal: internalSubTotal,
			adjustedSubTotal: internalSubTotal,
			taxRate,
			taxTotal: internalTaxTotal,
			grandTotal: roundCurrency(internalSubTotal + internalTaxTotal),
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			ccc: 0,
		},
		dealerPricing: {
			subTotal: dealerSubTotal,
			adjustedSubTotal: dealerSubTotal,
			taxRate,
			taxTotal: dealerTaxTotal,
			grandTotal: roundCurrency(dealerSubTotal + dealerTaxTotal),
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			ccc: 0,
		},
	};
}

const DEALER_PROGRAM_PARTNER_SUFFIX = "DPP";

async function createDealerProgramPartnerIdentity(
	db: Pick<Database, "salesOrders">,
	type: "order" | "quote",
) {
	const existingDppDocuments = await db.salesOrders.count({
		where: {
			dealerAuthId: {
				not: null,
			},
			deletedAt: null,
			orderId: {
				endsWith: DEALER_PROGRAM_PARTNER_SUFFIX,
			},
		},
	});
	let nextSerial = existingDppDocuments + 1;

	while (true) {
		const orderId = `${nextSerial.toString().padStart(5, "0")}${DEALER_PROGRAM_PARTNER_SUFFIX}`;
		const collisionCount = await db.salesOrders.count({
			where: {
				orderId,
			},
		});

		if (collisionCount === 0) {
			return {
				orderId,
				slug: `${type}-${orderId.toLowerCase()}`,
			};
		}

		nextSerial += 1;
	}
}

export async function saveDealerPortalQuote(
	db: Database,
	dealerId: number,
	input: DealerPortalSaveQuoteInput,
) {
	return db.$transaction(async (tx) => {
		const customer = await tx.customers.findFirst({
			where: {
				id: input.customerId,
				dealerOwnerId: dealerId,
				deletedAt: null,
			},
			select: {
				id: true,
				customerTypeId: true,
			},
		});

		if (!customer) {
			throw new Error("Dealer customer could not be found.");
		}

		const dealerProfileId =
			input.customerProfileId || customer.customerTypeId || null;
		const [dealerProfile, internalProfile] = await Promise.all([
			dealerProfileId
				? tx.customerTypes.findFirst({
						where: {
							id: dealerProfileId,
							dealerOwnerId: dealerId,
							deletedAt: null,
						},
						select: {
							id: true,
							title: true,
							salesPercentage: true,
						},
					})
				: null,
			getDealerPortalInternalSalesProfile(tx),
		]);

		if (dealerProfileId && !dealerProfile) {
			throw new Error("Dealer sales profile could not be found.");
		}

		await validateDealerPortalQuoteVisibility(tx, input.lineItems);

		const normalizedLines = input.lineItems.map((line, index) => {
			const qty = Number(line.qty ?? 0);
			const unitPrice = Number(line.unitPrice ?? 0);
			const lineTotal = roundCurrency(
				Number.isFinite(Number(line.lineTotal))
					? Number(line.lineTotal)
					: qty * unitPrice,
			);

			return {
				uid: line.uid || `dealer-line-${index + 1}`,
				title: line.title?.trim() || `Line ${index + 1}`,
				description: line.description?.trim() || "",
				qty,
				unitPrice,
				lineTotal,
				meta:
					line.meta &&
					typeof line.meta === "object" &&
					!Array.isArray(line.meta)
						? line.meta
						: {},
				formSteps: Array.isArray(line.formSteps) ? line.formSteps : [],
				shelfItems: Array.isArray(line.shelfItems) ? line.shelfItems : [],
				housePackageTool:
					line.housePackageTool &&
					typeof line.housePackageTool === "object" &&
					!Array.isArray(line.housePackageTool)
						? line.housePackageTool
						: null,
			};
		});

		const pricing = calculateDealerQuotePricing({
			taxRate: input.taxRate || 0,
			internalProfile,
			dealerProfile,
			lineItems: normalizedLines,
		});
		const pricingSnapshot = {
			source: pricing.source,
			createdAt: pricing.createdAt,
			profiles: pricing.profiles,
			lines: pricing.lines,
			internalPricing: pricing.internalPricing,
			dealerPricing: pricing.dealerPricing,
		};
		const existing = input.id
			? await tx.salesOrders.findFirst({
					where: {
						id: input.id,
						dealerAuthId: dealerId,
						deletedAt: null,
						type: "quote",
					},
					select: {
						id: true,
						orderId: true,
						slug: true,
					},
				})
			: null;

		if (input.id && !existing) {
			throw new Error("Dealer quote could not be found.");
		}

		const identity =
			existing || (await createDealerProgramPartnerIdentity(tx, "quote"));
		const orderData = {
			orderId: identity.orderId,
			slug: identity.slug,
			type: "quote",
			status: "Draft",
			isDyke: true,
			dealerAuthId: dealerId,
			customerId: customer.id,
			customerProfileId: internalProfile?.id || null,
			dealerSalesProfileId: dealerProfile?.id || null,
			taxPercentage: pricing.internalPricing.taxRate,
			subTotal: pricing.internalPricing.subTotal,
			tax: pricing.internalPricing.taxTotal,
			grandTotal: pricing.internalPricing.grandTotal,
			amountDue: pricing.internalPricing.grandTotal,
			meta: {
				source: "dealer_portal",
				pricingSnapshot,
				dealerPricing: {
					profileId: pricing.dealerProfileId,
					summary: pricing.dealerPricing,
					lines: pricing.lines.map((line) => ({
						uid: line.uid,
						unitPrice: line.dealerUnitPrice,
						lineTotal: line.dealerLineTotal,
					})),
				},
				internalPricing: {
					profileId: pricing.internalProfileId,
					summary: pricing.internalPricing,
					lines: pricing.lines.map((line) => ({
						uid: line.uid,
						unitPrice: line.internalUnitPrice,
						lineTotal: line.internalLineTotal,
					})),
				},
				newSalesForm: {
					version: `${Date.now()}`,
					updatedAt: new Date().toISOString(),
					autosave: false,
					lineItems: normalizedLines,
					extraCosts: [],
					summary: pricing.dealerPricing,
					form: {
						customerId: customer.id,
						customerProfileId: dealerProfile?.id || null,
						po: input.po || null,
						paymentTerm: input.paymentTerm || "None",
						goodUntil: input.goodUntil || null,
						deliveryOption: input.deliveryOption || "pickup",
						paymentMethod: input.paymentMethod || null,
						taxCode: input.taxCode || null,
					},
				},
			} as Prisma.InputJsonValue,
		};
		const created = existing
			? await tx.salesOrders.update({
					where: {
						id: existing.id,
					},
					data: orderData,
					select: {
						id: true,
						orderId: true,
						slug: true,
					},
				})
			: await tx.salesOrders.create({
					data: orderData,
					select: {
						id: true,
						orderId: true,
						slug: true,
					},
				});

		if (existing) {
			await tx.salesOrderItems.deleteMany({
				where: {
					salesOrderId: created.id,
				},
			});
		}

		await tx.salesOrderItems.createMany({
			data: normalizedLines.map((line, index) => ({
				salesOrderId: created.id,
				description: line.description || line.title,
				dykeDescription: line.title,
				qty: line.qty,
				rate: pricing.lines[index]?.internalUnitPrice || line.unitPrice,
				total: pricing.lines[index]?.internalLineTotal || line.lineTotal,
				meta: {
					uid: line.uid,
					title: line.title,
					formSteps: line.formSteps,
					shelfItems: line.shelfItems,
					housePackageTool: line.housePackageTool,
					lineMeta: line.meta,
					tax: dealerLineIsTaxable(line),
					internalUnitPrice: pricing.lines[index]?.internalUnitPrice,
					internalLineTotal: pricing.lines[index]?.internalLineTotal,
					dealerUnitPrice: pricing.lines[index]?.dealerUnitPrice,
					dealerLineTotal: pricing.lines[index]?.dealerLineTotal,
				} as Prisma.InputJsonValue,
				dykeProduction: dealerLineIsProduceable(line),
			})),
		});

		return {
			...created,
			internalPricing: pricing.internalPricing,
			dealerPricing: pricing.dealerPricing,
		};
	});
}

export async function convertDealerPortalQuoteToOrder(
	db: Database,
	dealerId: number,
	quoteId: number,
) {
	return db.$transaction(async (tx) => {
		const quote = await tx.salesOrders.findFirst({
			where: {
				id: quoteId,
				dealerAuthId: dealerId,
				deletedAt: null,
				type: "quote",
			},
			select: {
				id: true,
				meta: true,
			},
		});

		if (!quote) {
			throw new Error("Dealer quote could not be found.");
		}

		const identity = await createDealerProgramPartnerIdentity(tx, "order");
		const currentMeta =
			quote.meta && typeof quote.meta === "object" && !Array.isArray(quote.meta)
				? quote.meta
				: {};

		return tx.salesOrders.update({
			where: {
				id: quote.id,
			},
			data: {
				orderId: identity.orderId,
				slug: identity.slug,
				type: "order",
				status: "New",
				meta: {
					...currentMeta,
					convertedFromDealerQuoteId: quote.id,
					convertedAt: new Date().toISOString(),
				} as Prisma.InputJsonValue,
			},
			select: {
				id: true,
				orderId: true,
				slug: true,
				type: true,
				status: true,
			},
		});
	});
}

export async function getDealerPortalSettings(db: Database, dealerId: number) {
	return db.dealerAuth.findUnique({
		where: {
			id: dealerId,
		},
		select: {
			id: true,
			email: true,
			name: true,
			companyName: true,
			phoneNo: true,
			meta: true,
			primaryBillingAddress: {
				select: {
					id: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
				},
			},
		},
	});
}

export async function saveDealerPortalSettings(
	db: Database,
	dealerId: number,
	input: DealerSettingsFormInput,
) {
	return db.$transaction(async (tx) => {
		const dealer = await tx.dealerAuth.findUnique({
			where: {
				id: dealerId,
			},
			select: {
				id: true,
				meta: true,
				primaryBillingAddressId: true,
			},
		});

		if (!dealer) {
			throw new Error("Dealer account could not be found.");
		}

		const currentMeta =
			dealer.meta &&
			typeof dealer.meta === "object" &&
			!Array.isArray(dealer.meta)
				? dealer.meta
				: {};

		const addressData = {
			name: input.companyName?.trim() || input.name?.trim() || null,
			address1: input.address1?.trim() || null,
			address2: input.address2?.trim() || null,
			city: input.city?.trim() || null,
			state: input.state?.trim() || null,
			country: input.country?.trim() || null,
		};

		const address = dealer.primaryBillingAddressId
			? await tx.addressBooks.update({
					where: {
						id: dealer.primaryBillingAddressId,
					},
					data: addressData,
					select: {
						id: true,
					},
				})
			: await tx.addressBooks.create({
					data: {
						...addressData,
						meta: {
							source: "dealer_company_settings",
							dealerId,
						},
					},
					select: {
						id: true,
					},
				});

		return tx.dealerAuth.update({
			where: {
				id: dealerId,
			},
			data: {
				name: input.name?.trim() || null,
				companyName: input.companyName?.trim() || null,
				phoneNo: input.phoneNo?.trim() || null,
				primaryBillingAddressId: address.id,
				meta: {
					...currentMeta,
					logoUrl: input.logoUrl?.trim() || null,
				},
			},
			select: {
				id: true,
				email: true,
				name: true,
				companyName: true,
				phoneNo: true,
				meta: true,
			},
		});
	});
}

export async function completeDealerOnboarding(
	db: Database,
	input: CompleteDealerOnboardingInput,
) {
	return db.$transaction(async (tx) => {
		const invite = await tx.dealerToken.findFirst({
			where: {
				token: input.token,
				consumedAt: null,
				expiredAt: {
					gt: new Date(),
				},
			},
			select: {
				dealerId: true,
			},
		});

		if (!invite) {
			throw new Error("Dealer onboarding link is invalid or expired.");
		}

		const dealer = await tx.dealerAuth.update({
			where: {
				id: invite.dealerId,
			},
			data: {
				authUserId: input.authUserId,
				emailVerifiedAt: new Date(),
				status: "active",
			},
			select: {
				id: true,
				email: true,
				name: true,
				companyName: true,
				status: true,
			},
		});

		await tx.dealerToken.update({
			where: {
				token: input.token,
			},
			data: {
				consumedAt: new Date(),
			},
		});

		return dealer;
	});
}

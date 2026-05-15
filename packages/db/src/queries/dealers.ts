import type { Database, Prisma } from "..";

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
  customerTypeId?: number | null;
};

export type DealerSalesProfileFormInput = {
  id?: number | null;
  title: string;
  coefficient?: number | null;
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

function dealerSearchWhere(search?: string | null): Prisma.DealerAuthWhereInput {
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
      customerTypeId: true,
      createdAt: true,
      profile: {
        select: {
          id: true,
          title: true,
          coefficient: true,
        },
      },
    },
  });
}

export async function saveDealerPortalCustomer(
  db: Database,
  dealerId: number,
  input: DealerCustomerFormInput,
) {
  const data = {
    name: input.name?.trim() || null,
    businessName: input.businessName?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    phoneNo: input.phoneNo?.trim() || null,
    address: input.address?.trim() || null,
    customerTypeId: input.customerTypeId || null,
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
      },
    });

    if (!existing) {
      throw new Error("Dealer customer could not be found.");
    }

    return db.customers.update({
      where: {
        id: input.id,
      },
      data,
    });
  }

  return db.customers.create({
    data,
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
      coefficient: true,
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

export async function saveDealerPortalSalesProfile(
  db: Database,
  dealerId: number,
  input: DealerSalesProfileFormInput,
) {
  const data = {
    title: input.title.trim(),
    coefficient: input.coefficient ?? null,
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
  return db.salesOrders.findMany({
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
      dealer.meta && typeof dealer.meta === "object" && !Array.isArray(dealer.meta)
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

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

export type CompleteDealerOnboardingInput = {
  token: string;
  passwordHash: string;
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
        },
      },
    },
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
        password: input.passwordHash,
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

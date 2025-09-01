import { z } from "zod";
import { AddressBookMeta, Db } from "./types";
import { nanoid } from "nanoid";
import { devMode, hashPassword } from "@gnd/utils";

/*
createBilling: publicProcedure
      .input(createBillingSchema)
      .mutation(async (props) => {
        return createBilling(props.ctx.db, props.input);
      }),
*/
export const createBillingSchema = z.object({
  id: z.number().optional().nullable(),
  userId: z.number(),
  customerId: z.number().optional().nullable(),
  name: z.string(),
  email: z.string(),
  country: z.string(),
  phone: z.string(),
  address1: z.string(),
  address2: z.string().optional().nullable(),
  city: z.string(),
  state: z.string(),
  meta: z.object({
    zip_code: z.string(),
    placeId: z.string(),
    placeSearchText: z.string().optional().nullable(),
  }),
});
export type createBilling = z.infer<typeof createBillingSchema>;

export async function createBilling(db: Db, data: createBilling) {
  if (data.id)
    return await db.addressBooks.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email,
        country: data.country,
        phoneNo: data.phone,
        address1: data.address1,
        address2: data.address2,
        city: data.city,
        state: data.state,
        meta: {
          ...data.meta,
        },
      },
    });
  else {
    if (!data.customerId) {
      return (
        await db.customers.create({
          data: {
            user: {
              connect: { id: data.userId },
            },
            meta: {},
            addressBooks: {
              create: {
                isPrimary: true,
                name: data.name,
                email: data.email,
                country: data.country,
                phoneNo: data.phone,
                address1: data.address1,
                address2: data.address2,
                city: data.city,
                state: data.state,
                meta: {
                  ...data.meta,
                },
              },
            },
          },
          include: {
            addressBooks: {
              take: 1,
            },
          },
        })
      )?.addressBooks?.[0];
    } else
      return await db.addressBooks.create({
        data: {
          isPrimary: true,
          customer: {
            connect: { id: data.customerId },
          },
          name: data.name,
          email: data.email,
          country: data.country,
          phoneNo: data.phone,
          address1: data.address1,
          address2: data.address2,
          city: data.city,
          state: data.state,
          meta: {
            ...data.meta,
          },
        },
      });
  }
}

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[0-9]/, {
    message: "Password must contain at least one number",
  });

export const createPasswordSchema = z
  .object({
    id: z.number(),
    password: passwordSchema,
    confirmPassword: z.string(),
    agreeToTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // This will show the error message under the confirmPassword field
  });
export type CreatePasswordSchema = typeof createPasswordSchema._type;
export async function createPassword(db: Db, data: CreatePasswordSchema) {
  const u = await db.users.update({
    where: {
      id: data.id,
    },
    data: {
      password: await hashPassword(data.password),
    },
  });
  return {
    name: u.name,
  };
}
export const signupSchema = z
  .object({
    name: z.string().optional().nullable(),
    businessName: z.string().optional().nullable(),
    address: z.string().optional(),
    email: z.string().email(),
    phoneNo: z.string(),
    accountType: z.enum(["individual", "business"]),
    // password: passwordSchema,
    // confirmPassword: z.string(),
    agreeToTerms: z.boolean(),
  })
  // .refine((data) => data.password === data.confirmPassword, {
  //   message: "Passwords don't match",
  //   path: ["confirmPassword"], // This will show the error message under the confirmPassword field
  // })
  .refine(
    (data) => {
      if (data.accountType === "business") {
        return !!data.businessName;
      }
      return true;
    },
    {
      message: "Business name required!",
      path: ["businessName"],
    }
  )
  .refine(
    (data) => {
      if (data.accountType === "individual") {
        return !!data.name;
      }
      return true;
    },
    {
      message: "Enter a valid name",
      path: ["name"],
    }
  );
// .refine((data) => data.accountType == "business", {
//   message: "Business name required!",
//   path: ["businessName"],
// })
// .refine((data) => data.accountType == "individual", {
//   message: "Enter a valid name",
//   path: ["name"],
// });

export type Signup = typeof signupSchema._type;
export async function signup(db: Db, data: Signup) {
  const e = await db.users.findFirst({
    where: {
      OR: [
        {
          email: data.email,
        },
        {
          phoneNo: data.phoneNo,
        },
      ],
    },
  });
  console.log({ devMode, e });

  if (devMode && e) {
    return await db.users.update({
      where: {
        id: e.id,
      },
      data: {
        verificationToken: nanoid(),
      },
    });
  }
  if (e?.email == data?.email)
    throw new Error("User with email already exist!");
  if (e?.phoneNo == data?.phoneNo)
    throw new Error("User with phone no already exist!");
  const user = await db.users.create({
    data: {
      email: data.email,
      phoneNo: data.phoneNo,
      emailVerifiedAt: null,
      type: "CUSTOMER",
      verificationToken: nanoid(),
      customer: {
        create: {
          address: data.address,
          businessName: data.businessName,
          name: data.name,
          phoneNo: data.phoneNo,
          email: data.email,
          meta: {},
          addressBooks: {
            create: {
              isPrimary: true,
              name: data.name || data.businessName,
              phoneNo: data.phoneNo,
              email: data.email,
              address1: data.address,
              meta: {},
            },
          },
          // taxProfiles
        },
      },
    },
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

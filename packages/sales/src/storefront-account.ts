import { z } from "zod";
import { Db } from "./types";
import { nanoid } from "nanoid";

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

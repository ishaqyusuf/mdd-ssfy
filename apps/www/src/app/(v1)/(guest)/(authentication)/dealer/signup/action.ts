"use server";

import { prisma } from "@/db";
import { RegisterSchema } from "./validation";
import { redirect } from "next/navigation";
import { signupSuccess } from "@/app/(v2)/(loggedIn)/sales-v2/dealers/email-actions";

export async function signupDealerAction(data: RegisterSchema) {
    const dealer = await prisma.dealerAuth.findFirst({
        where: {
            email: data.email,
        },
    });
    const usr = await prisma.users.findFirst({
        where: {
            email: data.email,
        },
    });
    if (usr) throw Error("You cannot create a dealer account with this email.");
    if (dealer) {
        throw Error("Account with email already exists.");
    }
    const auth = await prisma.dealerAuth.create({
        data: {
            email: data.email,
            status: "Pending Approval",
            primaryBillingAddress: {
                create: {
                    address1: data.address,
                    city: data.city,
                    state: data.state,
                    meta: {},
                    email: data.email,
                    name: data.name,
                    phoneNo: data.phoneNo,
                },
            },
            primaryShippingAddress: {
                create: {
                    address1: data.address,
                    city: data.city,
                    state: data.state,
                    meta: {},
                    email: data.email,
                    name: data.name,
                    phoneNo: data.phoneNo,
                },
            },
            dealer: {
                create: {
                    name: data.name,
                    address: data.address,
                    email: data.email,
                    businessName: data.businessName,
                    meta: {},
                    phoneNo: data.phoneNo,
                },
            },
        },
    });
    await signupSuccess(auth.id);
    redirect(`/dealer/registration-submitted?email=${auth.email}`);
}

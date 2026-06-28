"use server";

import { getServerAuthSession } from "@/lib/auth/session";

export async function serverSession() {
    const data = await getServerAuthSession();
    if (!data) throw new Error();
    return data;
}
export async function dealerSession() {
    const auth = await serverSession();
    const dealerMode = auth.role?.name === "Dealer";
    return dealerMode;
}
export async function user() {
    const data = await getServerAuthSession();
    if (!data) return null;

    return {
        ...data.user,
        role: data.role,
        can: data.can,
        permissions: data.can,
    };
}
export const authUser = user;
export async function userId() {
    return (await user())?.id;
}
export const authId = userId;

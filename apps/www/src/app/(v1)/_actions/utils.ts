"use server";

import { prisma } from "@/db";
import { authOptions } from "@/lib/auth-options";
import { IUser } from "@/types/hrm";
import { consoleLog } from "@gnd/utils";
import { hash } from "bcrypt-ts";
import { getServerSession } from "next-auth";

export async function serverSession() {
    const data = await getServerSession(authOptions);
    if (!data) throw new Error();
    return data;
}
export async function dealerSession() {
    const auth = await serverSession();
    const dealerMode = auth.role?.name == "Dealer";
    return dealerMode;
}
export async function getSessionPermissions() {
    const session = await serverSession();
    return session.can;
}
export async function user() {
    const data = await getServerSession(authOptions);
    if (!data) return null;
    // throw new Error();
    return data.user;
}
export const authUser = user;
export async function userId() {
    return (await user())?.id;
}
export const authId = userId;
export async function _dbUser() {
    return (await prisma.users.findUnique({
        where: { id: await userId() },
    })) as any as IUser;
}
export async function streamlineMeta(meta: any = null) {
    if (meta == null) return {};

    function _streamline(value) {
        let _str: any = null;
        if (value != null) {
            if (typeof value === "object" && value?.length <= 0) {
                _str = {};
                Object.entries(value).map(([k, v]) => {
                    const _val = _streamline(v);
                    if (_val) _str[k] = _val;
                });
                return _str;
            } else {
                return value;
            }
        }
    }
    return _streamline(meta);
}
export async function hashPassword(pwrd) {
    return await hash(pwrd, 10);
}
export async function sessionIsDealerMode() {
    const s = await serverSession();
    let isDealerMode = s.role.name == "Dealer";
    if (!isDealerMode) return null;
    return {
        id: s.user.id,
    };
}

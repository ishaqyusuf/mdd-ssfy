"use server";

import { prisma } from "@/db";
import { PageFilterData } from "@/types/type";
import { unstable_cache } from "next/cache";

export async function employeesFilterData() {
    const fn = async () => {
        const [roles, profiles] = await Promise.all([
            getRoles(),
            getEmployeeProfiles(),
        ]);
        const response: PageFilterData[] = [
            {
                value: "search",
                icon: "Search",
                type: "input",
            },
            {
                value: "roleId",
                icon: "Rocket",
                type: "checkbox",
                options: roles.map((role) => ({
                    label: role.name,
                    value: String(role.id),
                })),
            },
            {
                value: "employeeProfileId",
                icon: "Rocket",
                type: "checkbox",
                options: profiles.map((role) => ({
                    label: role.name,
                    value: String(role.id),
                })),
            },
        ];
        return response;
    };
    const tags = [`employees_filter_data`];

    return unstable_cache(fn, tags, { tags })();
}
export async function getRoles() {
    const tags = [`roles`];
    return unstable_cache(
        async () => {
            return await prisma.roles.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
        },
        tags,
        { tags },
    )();
}
export async function getEmployeeProfiles() {
    const tags = [`employee-profiles`];
    return unstable_cache(
        async () => {
            const profiles = await prisma.employeeProfile.findMany({
                select: {
                    id: true,
                    name: true,
                },
            });
            return profiles;
        },
        tags,
        { tags },
    )();
}

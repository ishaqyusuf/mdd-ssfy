"use server";

import { prisma, Prisma } from "@/db";
import { BaseQuery } from "@/types/action";

import { _cache } from "../_cache/load-data";
import { getPageInfo, queryFilter } from "../action-utils";

export interface EmployeeQueryParamsProps extends BaseQuery {
    _show?: "payroll" | undefined;
    _roleId?;
    role?;
}
export async function getEmployees(query: EmployeeQueryParamsProps) {
    if (!query.sort) {
        query.sort = "name";
        query.sort_order = "asc";
    }
    const where = whereEmployee(query);
    const items = await prisma.users.findMany({
        where,
        include: {
            employeeProfile: true,
            roles: {
                include: {
                    role: true,
                },
            },
        },
        ...(await queryFilter(query)),
    });
    const pageInfo = await getPageInfo(query, where, prisma.users);

    return {
        pageInfo,
        data: items.map(({ roles, ...data }) => ({
            ...data,
            role: roles?.[0]?.role,
        })) as any,
    };
}
function whereEmployee(query: EmployeeQueryParamsProps) {
    const q = {
        contains: query._q || undefined,
    };
    const where: Prisma.UsersWhereInput = {
        name: q as any,
        deletedAt: null,
    };
    if (query._roleId) {
        where.roles = {
            some: {
                roleId: +query._roleId,
            },
        };
    }
    if (query.role)
        where.roles = {
            some: {
                role: {
                    name: query.role,
                },
            },
        };
    return where;
}
export async function staticEmployees(
    query: EmployeeQueryParamsProps = {} as any,
) {
    return await _cache(
        "employees",
        async () =>
            await prisma.users.findMany({
                where: whereEmployee(query),
                orderBy: {
                    name: "asc",
                },
            }),
    );
}
export async function staticJobEmployees() {
    return await _cache(
        "job-employees",
        async () =>
            await prisma.users.findMany({
                where: {
                    jobs: {
                        some: {
                            id: {
                                gt: 0,
                            },
                        },
                    },
                },
            }),
        "employees",
    );
}
export async function staticLoadTechEmployees() {
    return await _cache(
        "punchouts",
        async () =>
            await staticEmployees({
                role: "Punchout",
            }),
        "employees",
    );
}
export async function loadStatic1099Contractors() {
    return await _cache(
        "1099-contractors",
        async () =>
            await staticEmployees({
                role: "1099 Contractor",
            }),
    );
}

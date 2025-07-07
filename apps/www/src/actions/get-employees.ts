"use server";

import { SearchParamsType } from "@/components/(clean-code)/data-table/search-params";
import { __salesPayrollUpdated } from "./cache/cache-data-changed";
import { employeeQueryMetaData } from "@/utils/db/query.employees";
import { formatDate } from "@/lib/use-day";
import { padStart } from "lodash";

export async function getEmployees(query: SearchParamsType) {
    const { model, response, where, searchMeta } =
        await employeeQueryMetaData(query);

    const list = await model.findMany({
        where,
        ...searchMeta,
        orderBy: query?.sort
            ? searchMeta?.orderBy
            : {
                  name: "asc",
              },
        select: {
            id: true,
            name: true,
            createdAt: true,
            username: true,
            employeeProfile: {
                select: {
                    name: true,
                    id: true,
                },
            },
            roles: {
                select: {
                    role: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });
    return await response(
        list.map((item) => {
            return {
                uid: `GND-${formatDate(item.createdAt, `YYMM`)}-${padStart(String(item.id), 3, "0")}`,
                id: item.id,
                name: item.name,
                username: item.username,
                profile: item.employeeProfile,
                role: item.roles?.[0]?.role,
                date: formatDate(item.createdAt),
            };
        }),
    );
}

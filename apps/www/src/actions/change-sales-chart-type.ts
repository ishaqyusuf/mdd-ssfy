"use server";

import { cookies } from "next/headers";
import { actionClient } from "./safe-action";
import { changeSalesChartTypeSchema } from "./schema";
import { Cookies } from "@/utils/constants";
import { addYears } from "date-fns";
import { revalidateTag } from "next/cache";

export const changeSalesChartTypeAction = actionClient
    .schema(changeSalesChartTypeSchema)
    .metadata({
        name: "change-sales-chart-type",
    })
    .action(async ({ parsedInput: value }) => {
        (await cookies()).set({
            name: Cookies.SalesChartType,
            value,
            expires: addYears(new Date(), 1),
        });
        revalidateTag(`sales_`);
    });

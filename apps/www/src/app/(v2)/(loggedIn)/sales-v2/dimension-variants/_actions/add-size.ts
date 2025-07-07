"use server";

import { ftToIn, inToFt } from "@/lib/utils";
import { getHousePackageTool } from "./get-house-package-tool";
import { prisma } from "@/db";

export async function _addSize(w, _bifold) {
    const d = await getHousePackageTool();
    const [ftw] = [inToFt(w)];
    const s = {
        ft: ftw,
        in: w,
        width: true,
        height: false,
        type: _bifold ? "Bifold" : (null as any),
    };
    // console.log(s);
    d.data.sizes.push(s);
    await prisma.settings.update({
        where: {
            id: d.id,
        },
        data: {
            meta: d.data as any,
        },
    });
    return s;
}

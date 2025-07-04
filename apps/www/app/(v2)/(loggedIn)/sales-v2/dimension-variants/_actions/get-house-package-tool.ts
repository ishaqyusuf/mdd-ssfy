"use server";

import { prisma } from "@/db";
import { bifold_door } from "@/lib/community/home-template-builder";
import { ftToIn } from "@/lib/utils";
import { HousePackageToolSettings } from "../type";

export async function getHousePackageTool(): Promise<HousePackageToolSettings> {
    const s =
        (await prisma.settings.findFirst({
            where: {
                type: "house-package-tools",
            },
        })) ||
        (await prisma.settings.create({
            data: {
                type: "house-package-tools",
                meta: {
                    sizes: [],
                } as any,
                createdAt: new Date(),
            },
        }));
    return {
        id: s.id,
        type: s.type,
        data: await verifyBifoldDoors(s.id, s.meta as any),
    };
}
export async function verifyBifoldDoors(
    id,
    data: HousePackageToolSettings["data"]
) {
    const b = data.sizes.filter((b) => b.type == "Bifold");

    if (!b.length) {
        console.log(b);
        //
        const sizes = bifold_door
            .map((d) => d.label)
            .filter((s) => s?.includes("/"));
        // console.log(sizes);
        const _ = sizes
            .map((s) => {
                return s.replace("/", "-");
            })
            .map((s, i) => {
                // if (i > 0) return;
                let _in =
                    data.sizes.find((d) => s?.startsWith(d.ft))?.in ||
                    ftToIn(s);
                // const fa = data.sizes.find((_) => _.ft == "8-0");
                // console.log(fa);
                const foundB = data.sizes.filter(
                    (s) => s.in == _in && s.type == "Bifold"
                );
                if (!foundB.length) {
                    data.sizes.push({
                        type: "Bifold",
                        width: true,
                        in: _in,
                        ft: s,
                        height: false,
                    });
                    return true;
                }

                return false;
            });
        if (_.filter(Boolean).length) {
            console.log(data);

            await prisma.settings.update({
                where: {
                    id,
                },
                data: {
                    meta: data as any,
                },
            });
        }
    }

    return data;
}

import { prisma, Prisma } from "@/db";
import { SettingType } from "@/types/settings";

import { HousePackageToolSettings } from "../../types";
import { ftToIn } from "../utils/sales-utils";

export async function getDykeStepTitlesDta() {
    const sections = await prisma.dykeSteps.findMany({});
    const unique = sections
        .filter(
            (s, si) => si == sections.findIndex((s1) => s1.title == s.title),
        )
        .filter((s) => s.title?.trim());

    // console.log(unique);

    return unique;
}
export async function getDykeStepProductTitles(title) {
    const t = await prisma.dykeSteps.findFirst({
        where: {
            title,
        },
        include: {
            stepProducts: {
                include: {
                    product: true,
                },
            },
        },
    });
    return t?.stepProducts.map((p) => p.product.title).filter(Boolean);
}
export async function getDoorSizesDta(height) {
    const setting = await getHptSettings();
    const list: {
        dim: string;
        width: string;
        dimFt: string;
    }[] = [];
    const heightIn =
        setting.data.sizes.find((s) => s.ft == height && s.height)?.in ||
        ftToIn(height);
    setting.data.sizes
        // .filter((s) => (_bifold ? s.type == "Bifold" : s.type != "Bifold"))
        .map((size) => {
            if (size.width && size.ft)
                list.push({
                    dim: `${size.in} x ${heightIn}`.replaceAll('"', "in"),
                    dimFt: `${size.ft} x ${height}`.replaceAll('"', ""),
                    width: size.ft,
                });
        });
    return list.sort((a, b) => {
        // Split each element of the array by '-' to separate the numbers
        let [aFirst, aSecond] = a.width.split("-").map(Number) as any;
        let [bFirst, bSecond] = b.width.split("-").map(Number) as any;

        // Compare the first numbers
        if (aFirst !== bFirst) {
            return aFirst - bFirst;
        }

        // If the first numbers are equal, compare the second numbers
        return aSecond - bSecond;
    });
}
export async function getHptSettings() {
    const s = await prisma.settings.findFirst({
        where: {
            type: "house-package-tools" as SettingType,
        },
    });
    return {
        id: s.id,
        type: s.type,
        data: s.meta as any,
    } as HousePackageToolSettings;
}

import { Builders, Homes, Projects } from "@/db";

export function homeSearchMeta(
    home: Homes,
    project: Projects | undefined = undefined,
    builder: Builders | undefined = undefined,
) {
    const search: any[] = [];
    const { modelName, lot, block } = home;
    if (lot) search.push(`lot${lot} l${lot}`);
    if (block) search.push(`blk${block} b${block}`);
    if (lot && block) search.push(`${lot}/${block}`);
    return search.join(" ");
}

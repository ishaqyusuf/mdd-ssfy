import { prisma } from "@/db";

interface SearchPage {
    page: "sales";
    key: string;
    value: string;
}
export async function createSearchParamDta(page: SearchPage) {
    await prisma.searchParameters.create(page as any);
}

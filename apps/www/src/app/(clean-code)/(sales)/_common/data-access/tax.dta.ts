import { prisma, Taxes } from "@/db";

export async function getTaxesDta() {
    return await prisma.taxes.findMany({});
}

export async function getTaxesByTaxCodesDta() {
    const taxes = await getTaxesDta();
    let data: { [taxCode in string]: Taxes } = {};
    taxes.map((t) => (data[t.taxCode] = t));
    return data;
}

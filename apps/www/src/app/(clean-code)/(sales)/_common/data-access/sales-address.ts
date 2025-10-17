import { AddressBooks, prisma } from "@/db";

export async function updateAddressDta(
    id,
    orderId,
    data: Partial<AddressBooks>,
) {
    const resp = await prisma.addressBooks.update({
        where: { id },
        data: {
            ...data,
        },
    });
    return {
        status: "success",
        id,
    };
}
export async function saveSalesAddressDta(data) {
    // await prisma.addressBooks.upsert({
    //     where: {
    //         // id:
    //         AND: [
    //             { name: data.name },
    //             {
    //                 phoneNo: data.phoneNo,
    //             },
    //             {
    //                 OR: [{ email: null }, { email: data.email }],
    //             },
    //             {
    //                 OR: [{ address1: null }, { address1: data.address1 }],
    //             },
    //         ],
    //     },
    //     create: {},
    //     update: {},
    // });
}

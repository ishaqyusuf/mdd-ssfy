"use server";

import { Homes, prisma, Projects } from "@/db";

export async function synchronizeProject(project: Projects) {
    await prisma.invoices.updateMany({
        where: {
            refNo: project.refNo,
        },
        data: {
            projectId: project.id,
        },
    });
}
export async function unsynchronizeProjectInvoice(id) {
    await prisma.invoices.updateMany({
        where: {
            projectId: id,
        },
        data: {
            projectId: null,
        },
    });
}
export async function synchronizeUnit(unit: Homes) {
    const invoices = await prisma.invoices.updateMany({
        where: {
            projectId: unit.projectId,
            lot: unit.lot,
            block: unit.block,
        },
        data: {
            homeId: unit.id,
        },
    });
}
export async function synchronizeUnitTasks(unit: Homes) {}

"use server";

import { prisma } from "@/db";

export async function _fixHomeTaskDates() {
    // const tasks = await prisma.homeTasks.findMany({
    //     where: {
    //         createdAt: null
    //     },
    //     include: {
    //         home: true
    //     }
    // });
    // console.log(tasks.length);
}

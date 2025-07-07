import { Prisma } from "@/db";

import { DykeDoorType } from "../../type";

const _salesAssignmentIncludes =
    //:  Prisma.SalesOrdersInclude
    {
        // productionStatus: true,
        doors: {
            where: {
                housePackageTool: {
                    door: {
                        doorType: {
                            in: ["Garage", "Interior"] as DykeDoorType[],
                        },
                    },
                },
            },
            select: {
                id: true,
                doorType: true,
                lhQty: true,
                rhQty: true,
                totalQty: true,
            },
        },
        assignments: {
            include: {
                assignedTo: {
                    select: {
                        name: true,
                        id: true,
                    },
                },
                door: {
                    select: {
                        id: true,
                        housePackageTool: {
                            select: {
                                door: {
                                    select: {
                                        id: true,
                                        title: true,
                                        img: true,
                                    },
                                },
                            },
                        },
                    },
                },
                submissions: {
                    select: {
                        id: true,
                        qty: true,
                        leftHandle: true,
                    },
                },
            },
        },
        customer: {
            select: {
                id: true,
                businessName: true,
                name: true,
            },
        },
        salesRep: {
            select: {
                id: true,
                name: true,
            },
        },
    };

export const salesAssignmentIncludes = _salesAssignmentIncludes;
